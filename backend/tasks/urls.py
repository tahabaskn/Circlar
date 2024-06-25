from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookViewSet, TaskViewSet, ShortTaskViewSet, NoteViewSet, WeeklyScheduleViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet)
router.register(r'short-tasks', ShortTaskViewSet)
router.register(r'notes', NoteViewSet)
router.register(r'weekly-schedules', WeeklyScheduleViewSet)
router.register(r'books', BookViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('tasks/books/reorder/', BookViewSet.as_view({'post': 'reorder'}), name='books-reorder'),
]
