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


def scale_speaker_probs(p):
    # Normalize to show > 50 %
    p = 2 * p - 1  # [0, 1] -> [0, 2] -> [-1, 1]
    p[p < 0] = 0  # only use probs > 0.5
    return p


def read_data(path):
    d = read_json(path)
    p = np.array(d["p"][0])
    p_bc = np.array(d["p_bc"][0])
    p = scale_speaker_probs(p)

    # Topk
    probs = torch.tensor(d["probs"][0])
    tk = probs.topk(k=TOPK)
    topk, topk_p = tk.indices, tk.values

    data = {
        "vad": d["va"],
        "probs_ns_a": p[:, 0].tolist(),
        "probs_ns_b": p[:, 1].tolist(),
        "probs_bc_a": p_bc[:, 0].tolist(),
        "probs_bc_b": p_bc[:, 1].tolist(),
        "topk": topk.tolist(),
        "topk_p": topk_p.tolist(),
    }
    return data


@app.route("/<path>")
def api(path):
    filename = flask.request.args.get("filename")

    if path.lower() == "audio":
        wav_path = join(root, filename + ".wav")
        if exists(wav_path):
            return flask.send_file(wav_path)
        else:
            return f"Audio file {wav_path} does not exist!"

    elif path == "output":
        data_path = join(root, filename + ".json")
        if exists(data_path):
            d = read_json(data_path)
            p_bc_a = np.array(d["p_bc_a"])
            p_bc_b = np.array(d["p_bc_b"])

            print(d.keys())

            p = np.array(d["p"])
            print("p: ", tuple(p.shape))
            # p = scale_speaker_probs(p)

            # # Topk
            probs = torch.tensor(d["probs"])
            tk = probs.topk(k=TOPK)
            topk, topk_p = tk.indices, tk.values

            return {
                "vad_list": d["vad_list"],
                "p_ns_a": scale_speaker_probs(p).tolist(),
                "p_ns_b": scale_speaker_probs(1 - p).tolist(),
                "p_bc_a": p_bc_a.tolist(),
                "p_bc_b": p_bc_b.tolist(),
                "topk": topk.tolist(),
                "topk_p": topk_p.tolist(),
            }
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
