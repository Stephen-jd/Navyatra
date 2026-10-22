from django.contrib.auth.hashers import identify_hasher, make_password
from django.contrib.auth.models import User


def normalize_approval_password(password_value):
    if not password_value:
        return password_value
    try:
        identify_hasher(password_value)
        return password_value
    except ValueError:
        return make_password(password_value)


def sync_approved_user(registration, user=None):
    if user is None:
        user = User.objects.filter(username=registration.username).first()
    if user is None:
        first_name, _, last_name = registration.full_name.partition(' ')
        user = User(
            username=registration.username,
            email=registration.email,
            first_name=first_name,
            last_name=last_name,
        )

    user.email = registration.email
    user.is_active = True
    user.password = normalize_approval_password(registration.password)
    user.save()
    return user
