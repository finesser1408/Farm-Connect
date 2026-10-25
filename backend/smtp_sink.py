"""A tiny local SMTP sink used by the test suite.

It speaks just enough SMTP for Python's ``smtplib`` to hand over a message and
records every message it receives, so tests can assert on real transport-level
delivery instead of mocking the network away.
"""

import socketserver
import threading


class _SMTPHandler(socketserver.StreamRequestHandler):
    def handle(self):
        sink = self.server
        self.wfile.write(b"220 sink ESMTP ready\r\n")

        while True:
            line = self.rfile.readline()
            if not line:
                break

            command = line.strip().upper()
            if command.startswith(b"EHLO"):
                self.wfile.write(
                    b"250-sink\r\n250-8BITMIME\r\n250-AUTH PLAIN LOGIN\r\n250 HELP\r\n"
                )
            elif command.startswith(b"HELO"):
                self.wfile.write(b"250 sink\r\n")
            elif command.startswith(b"AUTH"):
                self.wfile.write(b"235 Authentication successful\r\n")
            elif command.startswith(b"DATA"):
                self.wfile.write(b"354 End data with <CR><LF>.<CR><LF>\r\n")
                payload = b""
                while True:
                    chunk = self.rfile.readline()
                    if not chunk or chunk in (b".\r\n", b".\n"):
                        break
                    payload += chunk
                sink.messages.append(payload.decode("utf-8", errors="replace"))
                self.wfile.write(b"250 OK: message accepted for delivery\r\n")
            elif command.startswith(b"QUIT"):
                self.wfile.write(b"221 Bye\r\n")
                break
            elif command.startswith((b"MAIL", b"RCPT", b"RSET", b"NOOP")):
                self.wfile.write(b"250 OK\r\n")
            else:
                self.wfile.write(b"502 Command not implemented\r\n")


class SMTPSink(socketserver.ThreadingTCPServer):
    """A local SMTP server that records messages instead of delivering them."""

    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, host="127.0.0.1", port=0):
        super().__init__((host, port), _SMTPHandler)
        self.messages = []
        self.bound_port = self.server_address[1]
        self._thread = None

    def start(self):
        self._thread = threading.Thread(target=self.serve_forever, daemon=True)
        self._thread.start()
        return self

    def stop(self):
        self.shutdown()
        self.server_close()
        if self._thread is not None:
            self._thread.join(timeout=5)

    def clear(self):
        self.messages = []

    @property
    def last_message(self):
        return self.messages[-1] if self.messages else ""