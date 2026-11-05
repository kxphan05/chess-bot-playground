from pybot import Engine

_engine = Engine()


def choose_move(board, time_left):
    return _engine.search(board, time_limit=min(1.0, max(0.1, time_left / 30)))
