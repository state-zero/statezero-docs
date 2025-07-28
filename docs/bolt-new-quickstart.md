# Using StateZero with Bolt.new

Build full-stack web apps with AI in minutes! This guide shows you how to use StateZero with Bolt.new to create AI-generated frontends that connect to your Django backend with real-time data.

## What You'll Build

- **Django backend** with StateZero (running locally)
- **AI-generated frontend** in Bolt.new that uses your Django models directly
- **Real-time updates** between your backend and Bolt.new frontend

## Prerequisites

- Python 3.8+ and Node.js 16+
- Free [Neon](https://neon.com) account (PostgreSQL database)
- Free [Pusher](https://pusher.com) account (real-time updates)

## Step 1: Create Your Django Backend (5 minutes)

### 1.1 Get Your Credentials

**Neon Database:**
1. Create a free account at [neon.com](https://neon.com)
2. Create a new database
3. Copy your connection string from the dashboard

**Pusher Real-time:**
1. Create a free account at [pusher.com](https://pusher.com)
2. Create a new Channels app
3. Note your App ID, Key, Secret, and Cluster

### 1.2 Create Backend with Cookiecutter

```bash
pip install cookiecutter
cookiecutter https://github.com/state-zero/cookiecutter-statezero-django
```

Follow the prompts and enter your Neon and Pusher credentials when asked.

### 1.3 Start Your Backend

```bash
# Navigate to your new project
cd your-project-name

# Install dependencies and set up database
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate

# Start Django server
python manage.py runserver
```

Your backend is now running with a `Note` model ready to use!

## Step 2: Expose Your Backend with StateZero Tunnel (2 minutes)

Since Bolt.new runs in the cloud, it needs a public URL to access your local Django backend.

### 2.1 Start the Tunnel

In a new terminal (keep Django running):

```bash
npx @statezero/statezero-tunnel 8000
```

You'll see output like:
```
🚀 Starting tunnel...
🌐 Subdomain: myapp-1a2b3c.tunnels.statezero.dev

Public URL:
https://myapp-1a2b3c.tunnels.statezero.dev ⟶ http://localhost:8000
```

**Important:** Keep this terminal open! Copy your tunnel URL (e.g., `https://myapp-1a2b3c.tunnels.statezero.dev`) - you'll need it in the next step.

### 2.2 Add Tunnel URL to Django Settings

Now add your specific tunnel URL to Django's `ALLOWED_HOSTS`. In your `settings.py`, update:

```python
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'myapp-1a2b3c.tunnels.statezero.dev',  # Replace with your actual tunnel subdomain
]
```

Restart your Django server after making this change:

```bash
python manage.py runserver
```

## Step 3: Open the Bolt.new Starter (1 minute)

Click this link to open the StateZero Vue starter in Bolt.new:

**[https://bolt.new/~/github.com/state-zero/statezero-vue-bolt-starter](https://bolt.new/~/github.com/state-zero/statezero-vue-bolt-starter)**

This opens a pre-configured Vue project with StateZero already set up.

## Step 4: Connect Bolt.new to Your Backend (2 minutes)

### 4.1 Update Configuration

In Bolt.new, open `statezero.config.js` and update the `BASE_URL`:

```javascript
// Replace this line:
export const BASE_URL = "http://127.0.0.1:8000";

// With your tunnel URL:
export const BASE_URL = "https://myapp-1a2b3c.tunnels.statezero.dev";
```

Also update your Pusher credentials in the same file:

```javascript
pusher: {
  clientOptions: {
    appKey: "your_pusher_key",      // Your actual Pusher key
    cluster: "your_pusher_cluster", // Your actual Pusher cluster
    forceTLS: true,
    authEndpoint: `${BASE_URL}/statezero/events/auth/`,
  },
},
```

### 4.2 Sync Your Models

In Bolt.new's terminal, run:

```bash
npx statezero sync-models
```

Select your models (including the `Note` model) and hit enter. This generates TypeScript models that mirror your Django models.

## Step 5: Build Your App with AI (5 minutes)

Now you can ask Bolt.new to create your app! Copy and paste this prompt:

```
Create a modern notes app using the Note model from my Django backend. The app should have:

- A clean dashboard showing all notes in a card layout
- Create new notes with title and content fields
- Edit existing notes inline or in a modal
- Delete notes with confirmation
- Search and filter functionality
- Real-time updates (when someone adds/edits a note, it appears instantly for all users)
- Responsive design with CSS
- Loading states and smooth animations

Refer to the README.md to see how to use the StateZero models. Make it feel like a premium note-taking app with good UX. Use standard css, don't use tailwind for css/styling.
```

## Step 6: Watch the Magic! ✨

As Bolt.new generates your frontend:

1. **Real-time updates work automatically** - Changes made in one browser tab appear instantly in others
2. **Django permissions are enforced** - Your backend security rules apply to the frontend
3. **Full ORM power** - Use complex filtering, relationships, and aggregations
4. **No API code needed** - Bolt.dev uses your Django models directly

## Example: Testing Real-time Updates

1. Open your Bolt.new app in two browser tabs
2. Create a new note in one tab
3. Watch it appear instantly in the other tab!

You can also test from your Django admin:
1. Go to `https://your-tunnel-url.tunnels.statezero.dev/admin`
2. Add/edit notes through Django admin
3. See changes appear instantly in your Bolt.new frontend

## Important: File Upload Limitations

**StateZero Tunnel has a 40KB file size limit.** Files larger than 40KB will fail to upload through the tunnel.

If your app needs file uploads during local development, configure Django storages to use a cloud provider like AWS S3, Cloudinary, or similar. This bypasses the tunnel limitation by uploading files directly to cloud storage.

## Troubleshooting

**Bolt.new can't connect to backend:**
- Ensure your tunnel is still running (`npx @statezero/statezero-tunnel 8000`)
- Check that `BASE_URL` in `statezero.config.js` matches your tunnel URL
- Verify your Django server is running on port 8000

**Models not syncing:**
- Make sure your Django backend is accessible via the tunnel URL
- Check that models are properly registered in `crud.py`
- Try running `npx statezero sync-models` again

**Real-time updates not working:**
- Verify Pusher credentials in both Django settings and `statezero.config.js`
- Check that your Pusher app is active and has remaining message quota

## Next Steps

Once you have your basic app working:

1. **Add more models** to your Django backend and sync them to Bolt.new
2. **Implement authentication** using Django's built-in user system
3. **Deploy your backend** to a service like Railway or Heroku
4. **Deploy your frontend** from Bolt.new to Netlify or Vercel

You now have a powerful workflow for building full-stack apps with AI! 🚀