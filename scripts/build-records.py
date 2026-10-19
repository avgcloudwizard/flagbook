"""Compatibility entry point for the current sourced records refresh."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name("refresh-records.py")), run_name="__main__")
