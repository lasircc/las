from rest_framework import serializers

class ResponseSerializer(serializers.Serializer):

    """
    Serializer class used to give the status of a request and eventually the erro code.
    """

    success = serializers.BooleanField()
    errorCode = serializers.CharField(max_length=200)