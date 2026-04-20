from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def global_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if response is not None:
        # Standardize the error format
        custom_response_data = {
            'status': 'error',
            'message': response.data.get('detail', 'An error occurred'),
            'errors': response.data
        }
        
        # If 'detail' is in response.data, we already put it in 'message'
        if 'detail' in custom_response_data['errors']:
            del custom_response_data['errors']['detail']
            
        response.data = custom_response_data
    else:
        # For non-DRF exceptions (like server errors)
        return Response({
            'status': 'error',
            'message': str(exc) if hasattr(exc, '__str__') else 'Internal Server Error',
            'errors': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response
