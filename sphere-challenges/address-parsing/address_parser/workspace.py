import re

LEFTOVER_TOKEN = re.compile(r"\w(?:[\w.#/&'-]*\w)?")


class Workspace:
    """An address string plus a record of which characters a stage has already explained.

    Stages search `available()` so they never re-read text another stage claimed.
    Claimed characters are blanked rather than removed, so match offsets stay valid.
    """

    def __init__(self, text):
        self.text = text
        self._claimed = [False] * len(text)

    def available(self):
        return "".join(" " if taken else ch for ch, taken in zip(self.text, self._claimed))

    def claim(self, start, end):
        for i in range(start, end):
            self._claimed[i] = True

    def leftover(self):
        """Unclaimed words, with stray separators dropped."""
        return " ".join(LEFTOVER_TOKEN.findall(self.available()))
