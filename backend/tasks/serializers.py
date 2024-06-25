from rest_framework import serializers
from .models import Book, Task, ShortTask, WeeklySchedule, Note

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'

class ShortTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShortTask
        fields = '__all__'

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = '__all__'

class WeeklyScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklySchedule
        fields = ['id', 'day', 'task', 'hours', 'completed']

    def validate(self, data):
        if data['task'] is None and (data['meal_hours'] is None or data['sleep_hours'] is None):
            raise serializers.ValidationError("Either task or both meal_hours and sleep_hours must be provided.")
        return data

class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = '__all__'
        extra_kwargs = {
            'startDate': {'format': '%Y-%m-%d', 'input_formats': ['%Y-%m-%d']},
            'endDate': {'format': '%Y-%m-%d', 'input_formats': ['%Y-%m-%d']}
        }
