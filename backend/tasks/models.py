from django.db import models

class Task(models.Model):
    title = models.CharField(max_length=100)
    duration = models.FloatField()
    days = models.IntegerField()
    is_short_task = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class ShortTask(models.Model):
    title = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    is_short_task = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.title

class Note(models.Model):
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.content[:50]

class WeeklySchedule(models.Model):
    day = models.CharField(max_length=10)
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    hours = models.FloatField()
    completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.day} - {self.task.title} - {self.hours} hours"

class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=200)
    status = models.CharField(max_length=20)
    startDate = models.DateField(null=True, blank=True)
    endDate = models.DateField(null=True, blank=True)
    thumbnail = models.URLField(null=True, blank=True)
    pages = models.IntegerField(null=True, blank=True)
    order = models.IntegerField(default=0)
    notes = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.title