document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity selector to avoid duplicating options on refresh
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants" aria-live="polite" data-activity="${escapeHtml(name)}">
            <h5>Participants</h5>
            <ul class="participants-list">
              ${details.participants.length
                ? details.participants.map(p => `<li><span class="avatar">${initials(p)}</span><span class="name">${escapeHtml(p)}</span><button class="remove-participant" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" aria-label="Remove ${escapeHtml(p)}">✖</button></li>`).join('')
                : ''}
            </ul>
            <div class="empty ${details.participants.length ? 'hidden' : ''}">${details.participants.length ? '' : 'Be the first to join!'}</div>
          </div>

          <button data-id="${details.id}">Sign up</button>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh the activities list so the new participant is visible immediately
        if (window.fetchActivities) window.fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  window.fetchActivities = fetchActivities;
  fetchActivities();
});

// Simple renderer for activities + participants

const activities = [
  {
    id: 1,
    title: 'Morning Yoga',
    description: 'An easy-flow class to start your day.',
    participants: ['Ava Stone', 'Marco Reed', 'Lia Kim']
  },
  {
    id: 2,
    title: 'Pasta Workshop',
    description: 'Learn to make fresh pasta from scratch.',
    participants: []
  },
  {
    id: 3,
    title: 'Photography Walk',
    description: 'Explore the city while taking photos.',
    participants: ['Diego M.']
  }
];

function initials(name) {
  return name
    .split(' ')
    .map(s => s[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function renderActivities() {
  const container = document.getElementById('activities-list');
  if (!container) return;
  container.innerHTML = '';

  activities.forEach(act => {
    const card = document.createElement('div');
    card.className = 'activity-card';
    card.innerHTML = `
      <h4>${escapeHtml(act.title)}</h4>
      <p>${escapeHtml(act.description)}</p>

      <div class="participants" aria-live="polite" data-activity="${escapeHtml(act.title)}">
        <h5>Participants</h5>
        <ul class="participants-list">
          ${act.participants.length
            ? act.participants.map(p => `<li><span class="avatar">${initials(p)}</span><span class="name">${escapeHtml(p)}</span><button class="remove-participant" data-activity="${escapeHtml(act.title)}" data-email="${escapeHtml(p)}" aria-label="Remove ${escapeHtml(p)}">✖</button></li>`).join('')
            : ''}
        </ul>
        <div class="empty ${act.participants.length ? 'hidden' : ''}">${act.participants.length ? '' : 'Be the first to join!'}</div>
      </div>

      <button data-id="${act.id}">Sign up</button>
    `;
    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', renderActivities);

// Delegate click for remove buttons (works for both server-rendered and local demo)
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.remove-participant');
  if (!btn) return;

  const activityName = btn.dataset.activity;
  const email = btn.dataset.email;
  const messageDiv = document.getElementById('message');

  // Determine if this is an email (server) or a local name
  if (email && email.includes('@')) {
    try {
      const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (res.ok) {
        if (messageDiv) {
          messageDiv.textContent = result.message || 'Participant removed';
          messageDiv.className = 'message success';
          messageDiv.classList.remove('hidden');
          setTimeout(() => messageDiv.classList.add('hidden'), 5000);
        }
        // Refresh server-rendered list if present
        if (window.fetchActivities) window.fetchActivities();
      } else {
        if (messageDiv) {
          messageDiv.textContent = result.detail || 'Failed to remove participant';
          messageDiv.className = 'message error';
          messageDiv.classList.remove('hidden');
        }
      }
    } catch (err) {
      if (messageDiv) {
        messageDiv.textContent = 'Network error while removing participant';
        messageDiv.className = 'message error';
        messageDiv.classList.remove('hidden');
      }
      console.error(err);
    }
  } else {
    // Local demo data
    const act = activities.find(a => a.title === activityName);
    if (act) {
      const idx = act.participants.indexOf(email);
      if (idx !== -1) {
        act.participants.splice(idx, 1);
        renderActivities();
      }
    }
  }
});
