# Generated by Django 5.0.6 on 2024-08-20 16:08

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("chatbot", "0004_document_user_is_admin"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="document",
            name="url",
        ),
        migrations.AddField(
            model_name="document",
            name="uploaded_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
