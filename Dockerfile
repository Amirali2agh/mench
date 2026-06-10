# Use the official lightweight Python image
FROM python:3.12-slim

# Set environment variables to optimize Python behavior inside the container
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /code

# Copy the dependency file to the working directory
COPY ./requirements.txt /code/requirements.txt

# Install Python dependencies using the Chabokan Iranian mirror for high-speed downloads
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt --index-url https://mirror2.chabokan.net/pypi/simple/

# Copy the entire app code directory into the container
COPY ./app /code/app

# Expose the port FastAPI runs on
EXPOSE 8000

# Start the FastAPI application using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]