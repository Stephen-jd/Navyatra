from django.contrib import admin
from django.contrib import messages
from django.contrib.auth.models import User
from .models import RegistrationRequest

@admin.register(RegistrationRequest)
class RegistrationRequestAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'username', 'email', 'phone_number', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('username', 'full_name', 'email', 'phone_number')
    actions = ['approve_registrations', 'reject_registrations']

    def approve_registrations(self, request, queryset):
        approved_count = 0
        skipped_count = 0

        for reg_req in queryset:
            if reg_req.status == 'APPROVED':
                skipped_count += 1
                continue
            
            # Check if user already exists in auth_user
            if User.objects.filter(username=reg_req.username).exists() or User.objects.filter(email=reg_req.email).exists():
                reg_req.status = 'APPROVED' # Mark as approved anyway since the user exists
                reg_req.save()
                skipped_count += 1
                continue

            try:
                # Create standard Django user
                # We directly set the hashed password that was stored in the registration request
                user = User(
                    username=reg_req.username,
                    email=reg_req.email,
                    first_name=reg_req.full_name.split(' ')[0] if ' ' in reg_req.full_name else reg_req.full_name,
                    last_name=' '.join(reg_req.full_name.split(' ')[1:]) if ' ' in reg_req.full_name else ''
                )
                user.password = reg_req.password  # Already hashed password
                user.is_active = True
                user.save()

                # Update registration request status
                reg_req.status = 'APPROVED'
                reg_req.save()
                approved_count += 1
            except Exception as e:
                self.message_user(request, f"Error approving {reg_req.username}: {str(e)}", messages.ERROR)

        if approved_count > 0:
            self.message_user(request, f"Successfully approved {approved_count} registration requests and created user accounts.", messages.SUCCESS)
        if skipped_count > 0:
            self.message_user(request, f"Skipped {skipped_count} requests (already approved or username/email already exists).", messages.WARNING)

    approve_registrations.short_description = "Approve selected registration requests"

    def reject_registrations(self, request, queryset):
        updated = queryset.filter(status='PENDING').update(status='REJECTED')
        self.message_user(request, f"Successfully marked {updated} pending requests as Rejected.", messages.SUCCESS)

    reject_registrations.short_description = "Reject selected registration requests"
