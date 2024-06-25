from django.contrib import admin
from .models import Task, ShortTask, Note, Book

class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'duration', "created_at", 'days', 'is_short_task')

class ShortTaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at', 'is_short_task')

class NoteAdmin(admin.ModelAdmin):
    list_display = ('content', 'created_at')

admin.site.register(Task, TaskAdmin)
admin.site.register(ShortTask, ShortTaskAdmin)
admin.site.register(Note, NoteAdmin)
admin.site.register(Book)
