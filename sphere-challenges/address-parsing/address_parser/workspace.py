import re

LEFTOVER_TOKEN = re.compile(r"\w(?:[\w.#/&'-]*\w)?")
WORD = re.compile(r"(?<!\w)[A-Za-z][A-Za-z.']*")
# Staff separate the parts of an address with these; a phrase never spans one.
SEPARATORS = ",;/"


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

    def chunks(self):
        """Unclaimed stretches as (start, end), split at separators and at anything already claimed."""
        spans, start = [], None
        for i in range(len(self.text) + 1):
            free = i < len(self.text) and not self._claimed[i] and self.text[i] not in SEPARATORS
            if free and start is None:
                start = i
            elif not free and start is not None:
                spans.append(self._trim(start, i))
                start = None
        return [span for span in spans if span]

    def words(self, start, end):
        """Words in a span as (start, end, word). Numbers and punctuation are skipped."""
        text = self.available()[start:end]
        return [(start + m.start(), start + m.end(), m.group()) for m in WORD.finditer(text)]

    def leftover(self):
        """Unclaimed words, with stray separators dropped."""
        return " ".join(LEFTOVER_TOKEN.findall(self.available()))

    def _trim(self, start, end):
        while start < end and not self.text[start].isalnum():
            start += 1
        while end > start and not self.text[end - 1].isalnum():
            end -= 1
        return (start, end) if start < end else None
