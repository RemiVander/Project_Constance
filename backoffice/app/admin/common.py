from fastapi.templating import Jinja2Templates

# Centralized templates instance for admin HTML pages.
# Keep directory consistent with existing project structure.
templates = Jinja2Templates(directory="app/templates")
