from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import RegistrationRequest
from .import ollama_helper

def entry_view(request):
    """
    Renders login and registration on a single elegant page with sliding backgrounds.
    Handles login submissions and registration requests.
    """
    if request.user.is_authenticated:
        return redirect('landing')

    error_message = None
    success_message = None
    active_tab = "login"

    if request.method == "POST":
        action = request.POST.get("action")

        if action == "register":
            active_tab = "register"
            username = request.POST.get("username", "").strip()
            full_name = request.POST.get("full_name", "").strip()
            email = request.POST.get("email", "").strip()
            phone = request.POST.get("phone", "").strip()
            password = request.POST.get("password", "")

            if not username or not full_name or not email or not phone or not password:
                error_message = "All fields are required for registration."
            elif RegistrationRequest.objects.filter(username=username).exists() or User.objects.filter(username=username).exists():
                error_message = "Username is already registered."
            elif RegistrationRequest.objects.filter(email=email).exists() or User.objects.filter(email=email).exists():
                error_message = "Email is already registered."
            else:
                try:
                    # Hash password before storing in request for database security
                    hashed_pw = make_password(password)
                    RegistrationRequest.objects.create(
                        username=username,
                        full_name=full_name,
                        email=email,
                        phone_number=phone,
                        password=hashed_pw,
                        status='PENDING'
                    )
                    success_message = "Your registration request has been submitted to the Administrator. Once approved, you can login!"
                    active_tab = "login" # Switch back to login for feedback
                except Exception as e:
                    error_message = f"An error occurred during registration: {str(e)}"

        elif action == "login":
            active_tab = "login"
            username = request.POST.get("username", "").strip()
            password = request.POST.get("password", "")

            if not username or not password:
                error_message = "Please fill in all login fields."
            else:
                # First, check if there is an active user
                user = authenticate(username=username, password=password)
                if user is not None:
                    if user.is_active:
                        login(request, user)
                        return redirect('landing')
                    else:
                        error_message = "Your account is disabled. Contact Admin."
                else:
                    # Let's check if the request is still pending in RegistrationRequest
                    pending_req = RegistrationRequest.objects.filter(username=username).first()
                    if pending_req:
                        if pending_req.status == 'PENDING':
                            error_message = "Your registration request is pending administrator approval. Please check back later."
                        elif pending_req.status == 'REJECTED':
                            error_message = "Your registration request has been rejected by the administrator."
                        else:
                            error_message = "Invalid login credentials. Please try again."
                    else:
                        error_message = "Invalid username or password."

    return render(request, 'registration.html', {
        'error_message': error_message,
        'success_message': success_message,
        'active_tab': active_tab
    })

@login_required(login_url='entry')
def landing_view(request):
    """
    Renders the premium NavYatra Travel Guider landing page dashboard.
    """
    return render(request, 'landing.html', {
        'user': request.user
    })

def logout_view(request):
    """
    Logs out the user and redirects to login/register.
    """
    logout(request)
    return redirect('entry')

@login_required(login_url='entry')
def api_explore_spots(request):
    """
    AJAX endpoint: Searches and returns the best spots in the area with real estimated values.
    """
    location = request.GET.get('location', '').strip()
    sub_location = request.GET.get('sub_location', '').strip()

    if not location or not sub_location:
        return JsonResponse({'error': 'Location and sub-location are required.'}, status=400)

    try:
        spots = ollama_helper.explore_spots_ai(location, sub_location)
        return JsonResponse({'spots': spots})
    except Exception as e:
        return JsonResponse({'error': f'Failed to explore spots: {str(e)}'}, status=500)

@login_required(login_url='entry')
def api_generate_itinerary(request):
    """
    AJAX endpoint: Generates a budget-effective daily visual map.
    Validates: budget >= 10,000 INR, days >= 2 days.
    """
    location = request.GET.get('location', '').strip()
    sub_location = request.GET.get('sub_location', '').strip()
    budget_str = request.GET.get('budget', '').strip()
    days_str = request.GET.get('days', '').strip()

    if not location or not sub_location or not budget_str or not days_str:
        return JsonResponse({'error': 'All fields are required.'}, status=400)

    try:
        budget = int(budget_str)
        days = int(days_str)
    except ValueError:
        return JsonResponse({'error': 'Budget and days must be valid numbers.'}, status=400)

    # Budget and duration validations
    if budget < 10000:
        return JsonResponse({'error': 'Budgets less than 10,000 INR are not accepted.'}, status=400)
    
    if days < 2:
        return JsonResponse({'error': 'Journey duration must be at least 2 days.'}, status=400)

    try:
        itinerary = ollama_helper.generate_itinerary_ai(location, sub_location, budget, days)
        return JsonResponse(itinerary)
    except Exception as e:
        return JsonResponse({'error': f'Failed to generate visual map: {str(e)}'}, status=500)
