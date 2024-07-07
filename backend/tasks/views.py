import json
from django.http import JsonResponse
from rest_framework import viewsets, status
from .models import Book, Task, ShortTask, Note, WeeklySchedule
from .serializers import BookSerializer, TaskSerializer, ShortTaskSerializer, NoteSerializer, WeeklyScheduleSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.shortcuts import render

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.filter(is_deleted=False)
    serializer_class = TaskSerializer

class ShortTaskViewSet(viewsets.ModelViewSet):
    queryset = ShortTask.objects.all()
    serializer_class = ShortTaskSerializer

    @action(detail=True, methods=['post'])
    def soft_delete(self, request, pk=None):
        short_task = self.get_object()
        short_task.is_deleted = True
        short_task.save()
        return Response({'status': 'short task soft deleted'})

class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer

class WeeklyScheduleViewSet(viewsets.ModelViewSet):
    queryset = WeeklySchedule.objects.all()
    serializer_class = WeeklyScheduleSerializer

    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        weekly_schedule = self.get_object()
        weekly_schedule.completed = True
        weekly_schedule.save()
        return Response({'status': 'task marked as complete'})

    @action(detail=True, methods=['post'])
    def mark_incomplete(self, request, pk=None):
        weekly_schedule = self.get_object()
        weekly_schedule.completed = False
        weekly_schedule.save()
        return Response({'status': 'task marked as incomplete'})

    @action(detail=False, methods=['post'])
    def create_bulk(self, request):
        schedules = request.data.get('schedules', [])
        WeeklySchedule.objects.all().delete()  # Clear existing schedules
        created_schedules = []

        for schedule in schedules:
            try:
                task_id = schedule['task']
                task = Task.objects.get(id=task_id) if task_id is not None else None
                weekly_schedule = WeeklySchedule.objects.create(
                    day=schedule['day'],
                    task=task,
                    hours=schedule['hours'],
                    completed=schedule.get('completed', False),
                )
                created_schedules.append(weekly_schedule)
            except Task.DoesNotExist:
                return Response({'error': f"Task with ID {schedule['task']} does not exist."}, status=400)

        return Response({'status': 'schedules created', 'schedules': WeeklyScheduleSerializer(created_schedules, many=True).data})

    @action(detail=False, methods=['get'])
    def get_schedules(self, request):
        schedules = WeeklySchedule.objects.all()
        data = WeeklyScheduleSerializer(schedules, many=True).data
        return Response(data)

    @action(detail=False, methods=['post'])
    def create_bulk(self, request):
        schedules = request.data.get('schedules', [])
        WeeklySchedule.objects.all().delete()  # Clear existing schedules
        created_schedules = []

        for schedule in schedules:
            try:
                task_id = schedule['task']
                task = Task.objects.get(id=task_id) if task_id is not None else None
                weekly_schedule = WeeklySchedule.objects.create(
                    day=schedule['day'],
                    task=task,
                    hours=schedule['hours'],
                    completed=schedule.get('completed', False)
                )
                created_schedules.append(weekly_schedule)
            except Task.DoesNotExist:
                return Response({'error': f"Task with ID {schedule['task']} does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': 'schedules created', 'schedules': WeeklyScheduleSerializer(created_schedules, many=True).data})


    @action(detail=False, methods=['post'])
    def move_task(self, request):
        task_id = request.data.get('taskId')
        old_day = request.data.get('oldDay')
        new_day = request.data.get('newDay')
        new_hours = request.data.get('newHours')

        if not all([task_id, old_day, new_day, new_hours]):
            return Response({'error': 'Missing fields'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            old_schedule = WeeklySchedule.objects.get(day=old_day, task=task)
        except WeeklySchedule.DoesNotExist:
            return Response({'error': 'Old schedule not found'}, status=status.HTTP_404_NOT_FOUND)

        new_schedule, created = WeeklySchedule.objects.get_or_create(day=new_day, task=task)
        new_schedule.hours += new_hours
        old_schedule.hours -= new_hours

        if old_schedule.hours <= 0:
            old_schedule.delete()
        else:
            old_schedule.save()

        new_schedule.save()
        return Response({'status': 'Task moved successfully'})

    @action(detail=False, methods=['get'])
    def get_weekly_progress(self, request):
        days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
        progress = {day: {} for day in days}
        schedules = WeeklySchedule.objects.all()
        for schedule in schedules:
            task = schedule.task
            if task:
                progress[schedule.day][task.title] = schedule.completed
        return Response(progress)

    @action(detail=True, methods=['delete'])
    def delete_book(self, request, pk=None):
        book = self.get_object()
        book.delete()
        return Response({'status': 'book deleted'})

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all().order_by('order')
    serializer_class = BookSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data

        if 'order' in data:
            instance.order = data['order']

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        books = request.data
        for book_data in books:
            try:
                book = Book.objects.get(id=book_data['id'])
                book.order = book_data['order']
                book.save()
            except Book.DoesNotExist:
                return Response({'error': f"Book with ID {book_data['id']} does not exist."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'status': 'books reordered'})


def index(request):
    return render(request, 'index.html')