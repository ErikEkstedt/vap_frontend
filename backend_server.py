from argparse import ArgumentParser
from pathlib import Path
from os.path import join
import numpy as np
import torch
import json
import flask
import pandas as pd
import ast

from vap.utils.utils import vad_onehot_to_vad_list


app = flask.Flask(__name__)

TOPK = 5
ROOT = "recordings"
Path(ROOT).mkdir(exist_ok=True, parents=True)


def read_csv_vap(path: Path):
    if path.suffix == ".tsv":
        df = pd.read_csv(path, delimiter="\t")
    else:
        df = pd.read_csv(path)
    if ("topk" in df.columns) and ("topk_p" in df.columns):
        # Convert 'topk' and 'topk_p' columns to lists
        df["topk"] = df["topk"].apply(ast.literal_eval)
        df["topk_p"] = df["topk_p"].apply(ast.literal_eval)
        # Convert lists to numpy arrays
        df["topk"] = df["topk"].apply(np.array)
        df["topk_p"] = df["topk_p"].apply(np.array)
    return df


def load_and_prepare_output_old(path, k=5):
    """
    her_output.json
    ---------------
    probs: (1, 8243, 256), <class 'torch.Tensor'>
    vad: (1, 8243, 2), <class 'torch.Tensor'>
    p_bc: (1, 8243, 2), <class 'torch.Tensor'>
    p_now: (1, 8243, 2), <class 'torch.Tensor'>
    p_future: (1, 8243, 2), <class 'torch.Tensor'>
    H: (1, 8243), <class 'torch.Tensor'>
    vad_list: 2, <class 'list'>
    """

    def scale_speaker_probs(p):
        # Normalize to show > 50 %
        p = 2 * p - 1  # [0, 1] -> [0, 2] -> [-1, 1]
        p[p < 0] = 0  # only use probs > 0.5
        return p

    d = read_json(path)
    for kk, v in d.items():
        if kk == "vad_list":
            continue

        if kk == "probs":
            d[kk] = torch.tensor(v)
        else:
            d[kk] = np.array(v)
        print(kk, d[kk].shape)

    n = 3
    pn = d["p_now"][0, ::n, 0]
    pf = d["p_future"][0, ::n, 0]
    tk = d["probs"][0, ::n].topk(k=k)
    topk, topk_p = tk.indices, tk.values
    return {
        "vad_list": d["vad_list"][0],
        "p_now_a": scale_speaker_probs(pn).tolist(),
        "p_now_b": scale_speaker_probs(1 - pn).tolist(),
        "p_future_a": scale_speaker_probs(pf).tolist(),
        "p_future_b": scale_speaker_probs(1 - pf).tolist(),
        "p_bc_a": d["p_bc"][0, ::n, 0].tolist(),
        "p_bc_b": d["p_bc"][0, ::n, 1].tolist(),
        "H": d["H"][0, ::n].tolist(),
        "topk": topk.tolist(),
        "topk_p": topk_p.tolist(),
    }


def load_and_prepare_output(path: Path, k=5):
    """
    her_output.json
    ---------------
    probs: (1, 8243, 256), <class 'torch.Tensor'>
    vad: (1, 8243, 2), <class 'torch.Tensor'>
    p_bc: (1, 8243, 2), <class 'torch.Tensor'>
    p_now: (1, 8243, 2), <class 'torch.Tensor'>
    p_future: (1, 8243, 2), <class 'torch.Tensor'>
    H: (1, 8243), <class 'torch.Tensor'>
    vad_list: 2, <class 'list'>
    """

    def scale_speaker_probs(p):
        # Normalize to show > 50 %
        p = 2 * p - 1  # [0, 1] -> [0, 2] -> [-1, 1]
        p[p < 0] = 0  # only use probs > 0.5
        return p

    def smooth(x, n=3):
        if isinstance(x, np.ndarray):
            x = torch.from_numpy(x).float()
        return x.unfold(0, size=n, step=n - 1).mean(dim=-1)

    df = read_csv_vap(path)

    # get vad
    v1 = torch.from_numpy(df["v1"].values)
    v2 = torch.from_numpy(df["v2"].values)
    vad = torch.stack((v1, v2), dim=-1)
    vad = (vad >= 0.5).long()
    vad_list = vad_onehot_to_vad_list(vad.unsqueeze(0))[0]
    topk = np.stack(df["topk"].values)
    topk_p = np.stack(df["topk_p"].values)

    n = 3
    pn = smooth(df["p_now"].values, n)
    pf = smooth(df["p_future"].values, n)
    pna = scale_speaker_probs(pn).tolist()
    pnb = scale_speaker_probs(1 - pn).tolist()
    pfa = scale_speaker_probs(pf).tolist()
    pfb = scale_speaker_probs(1 - pf).tolist()
    return {
        "vad_list": vad_list,
        "p_now_a": pna,
        "p_now_b": pnb,
        "p_future_a": pfa,
        "p_future_b": pfb,
        "topk": topk.tolist(),
        "topk_p": topk_p.tolist(),
    }


@app.route("/files")
def files():
    session_paths = list(Path(ROOT).glob("**/*.wav"))
    sessions = [s.parent.stem for s in session_paths]
    return json.dumps(sessions)


# TODO: path handling in a normal way with next.js?
# @app.route("/files")
# @app.route("/audio")
# @app.route("/output")
@app.route("/<path>")
def api(path):
    filename = flask.request.args.get("filename")
    session, k = filename.split("-")
    k = int(k.replace("topk=", ""))
    print(flask.request.args)
    print("filename: ", filename)
    print("k: ", k)

    if path.lower() == "audio":
        wav_path = Path(join(ROOT, session, "audio.wav"))
        wav_ret = f"Audio file {wav_path} does not exist!"
        if wav_path.exists():
            wav_ret = flask.send_file(wav_path)
        return wav_ret
    elif path.lower() == "output":
        data_path = Path(join(ROOT, session, "vap.tsv"))
        vap_ret = f"Audio file {data_path} does not exist!"
        if data_path.exists():
            vap_ret = load_and_prepare_output(data_path)
        return vap_ret

    return "You want path: %s" % path


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("--port", type=int, default=5000)
    args = parser.parse_args()

    # app.run(debug=args.debug, port=args.port)
    app.run(debug=True, port=args.port)
