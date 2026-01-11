from fastapi.templating import Jinja2Templates
from fastapi import Request
from typing import Dict, Any

# Centralized templates instance for admin HTML pages.
# Keep directory consistent with existing project structure.
templates = Jinja2Templates(directory="app/templates")

# Ajouter get_csrf_token comme fonction globale dans les templates
from app.csrf import get_or_create_csrf_token
templates.env.globals['get_csrf_token'] = get_or_create_csrf_token


def template_response(template_name: str, request: Request, context: Dict[str, Any]):
    """Wrapper pour TemplateResponse qui ajoute automatiquement csrf_token."""
    if "csrf_token" not in context:
        context["csrf_token"] = get_or_create_csrf_token(request)
    context["request"] = request
    return templates.TemplateResponse(template_name, context)
