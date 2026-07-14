import sys
import json
import struct
import os
import base64
import threading
import time
from datetime import datetime

try:
    from pywinauto import Desktop
except ImportError:
    Desktop = None  # dialog automation disabled until pywinauto is installed

# ---- CUSTOMIZE THIS: exactly where you want the data saved ----
SAVE_FOLDER = r"C:\Users\YourName\Documents\ScrapedData"  # <-- change this path

# Updated each time the extension tells us a click is about to happen.
# The persistent watcher thread below always uses whatever this currently is.
pending_filename = "scope-data.scp"


def get_message():
    """Reads one native-messaging message from Chrome (4-byte length + JSON)."""
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        sys.exit(0)
    message_length = struct.unpack('=I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)


def send_message(message_content):
    """Sends one native-messaging message back to Chrome."""
    encoded_content = json.dumps(message_content).encode('utf-8')
    encoded_length = struct.pack('=I', len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()


def dialog_watcher_loop():
    """
    Runs forever in the background (one single thread, started once).
    Continuously checks whether a Windows 'Save As' dialog is open.
    The moment one appears, it fills in the destination path and clicks Save,
    then goes back to watching for the next one.
    """
    if Desktop is None:
        return  # pywinauto not installed; silently does nothing

    desktop = Desktop(backend="uia")

    while True:
        try:
            dlg = desktop.window(title_re=".*Save As.*")
            if dlg.exists(timeout=0.2):
                dlg.set_focus()
                full_path = os.path.join(SAVE_FOLDER, pending_filename)

                edit_box = dlg.child_window(class_name="Edit", control_type="Edit")
                edit_box.set_edit_text(full_path)

                try:
                    dlg.child_window(title_re="Save|&Save", control_type="Button").click()
                except Exception:
                    dlg.type_keys("{ENTER}")

                send_message({'status': 'ok', 'path': full_path, 'time': datetime.now().isoformat()})

                # Brief pause so we don't immediately re-detect the same
                # dialog while it's still closing.
                time.sleep(1.5)
        except Exception:
            pass

        time.sleep(0.2)


def main():
    os.makedirs(SAVE_FOLDER, exist_ok=True)

    # Start the single persistent watcher thread once, right away.
    threading.Thread(target=dialog_watcher_loop, daemon=True).start()

    global pending_filename

    while True:
        msg = get_message()
        action = msg.get('action')

        if action == 'watchDialog':
            # Just update which filename the watcher should use next —
            # the watcher thread itself is already running.
            pending_filename = msg.get('filename') or pending_filename

        elif action == 'saveData':
            data_b64 = msg.get('data', '')
            filename = msg.get('filename') or pending_filename
            filepath = os.path.join(SAVE_FOLDER, filename)

            try:
                raw_bytes = base64.b64decode(data_b64)
                with open(filepath, 'wb') as f:
                    f.write(raw_bytes)

                send_message({
                    'status': 'ok',
                    'path': filepath,
                    'time': datetime.now().isoformat(),
                })
            except Exception as e:
                send_message({'status': 'error', 'error': str(e)})


if __name__ == '__main__':
    main()
