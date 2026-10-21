# -*- coding: utf-8 -*-
"""
Browser host for the end-to-end checks.

Node's child_process cannot launch Chrome in this environment - the spawn
succeeds but the parent event loop stalls indefinitely, and neither
stdio:'ignore', detached nor unref avoids it. Python's Popen does not have
that problem, so the browser is started here and Node connects to it over
the DevTools protocol.

Usage: python scripts/e2e-browser.py [--stop]
"""
import json, os, shutil, subprocess, sys, time, urllib.request

CHROME = os.environ.get('CHROME_PATH', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
PORT = int(os.environ.get('CONTRA_CDP_PORT', '9505'))
APP = os.environ.get('CONTRA_URL', 'http://localhost:4180/')
PROFILE = os.path.abspath(os.path.join('.tmp', 'e2e-browser'))


def alive():
    try:
        with urllib.request.urlopen('http://127.0.0.1:%d/json/version' % PORT, timeout=3):
            return True
    except Exception:
        return False


def stop():
    try:
        subprocess.run(['taskkill', '/F', '/IM', 'chrome.exe'], capture_output=True)
    except Exception:
        pass


def main():
    if '--stop' in sys.argv:
        stop()
        print('browser stopped')
        return 0

    if alive():
        print('already running on port %d' % PORT)
        return 0

    if not os.path.exists(CHROME):
        print('chrome not found: %s' % CHROME)
        return 1

    stop()
    time.sleep(1)
    shutil.rmtree(PROFILE, ignore_errors=True)
    os.makedirs(PROFILE, exist_ok=True)

    subprocess.Popen(
        [CHROME, '--headless=new', '--disable-gpu', '--no-sandbox', '--mute-audio',
         '--remote-debugging-port=%d' % PORT, '--user-data-dir=' + PROFILE,
         '--window-size=1280,720', APP],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=0x00000008,
    )

    for _ in range(20):
        time.sleep(1)
        if alive():
            print('browser ready on port %d' % PORT)
            return 0

    print('browser did not become ready')
    return 1


if __name__ == '__main__':
    sys.exit(main())
