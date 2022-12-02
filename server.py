from argparse import ArgumentParser
from os.path import join, exists
from os import makedirs, listdir
import numpy as np
import torch
import json
import flask

global root


app = flask.Flask(__name__)

TOPK = 5


def read_json(path, encoding="utf8"):
    with open(path, "r", encoding=encoding) as f:
        data = json.loads(f.read())
    return data


def write_json(data, filename):
    with open(filename, "w", encoding="utf-8") as jsonfile:
        json.dump(data, jsonfile, ensure_ascii=False)


def load_and_prepare_output(path, k=10):
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


@app.route("/<path>")
def api(path):
    filename = flask.request.args.get("filename")

    filename, k = filename.split("-")
    k = int(k.replace("topk=", ""))
    print(flask.request.args)
    print("filename: ", filename)
    print("k: ", k)

    if path.lower() == "audio":
        wav_path = join(root, filename + ".wav")
        if exists(wav_path):
            return flask.send_file(wav_path)
        else:
            return f"Audio file {wav_path} does not exist!"

    elif path == "output":
        data_path = join(root, filename + ".json")
        if exists(data_path):
            return load_and_prepare_output(data_path, k=10)
        else:
            return f"Audio file {data_path} does not exist!"

    return "You want path: %s" % path


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument(
        "--root",
        type=str,
        # default="audio_server_files",
        default="./data",
    )
    parser.add_argument("--debug", action="store_true")
    parser.add_argument("--port", type=int, default=5000)
    args = parser.parse_args()

    root = args.root
    makedirs(root, exist_ok=True)

    # app.run(debug=args.debug, port=args.port)
    app.run(debug=True, port=args.port)
