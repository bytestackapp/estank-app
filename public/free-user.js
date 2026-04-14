// free-user.js - Include this in pages that have free trial restrictions
// Usage: <script src="/free-user.js"></script>

window.FreeTrial = {
  isFreeUser: false,
  isExpired: false,

  // Call this on page load
  async init() {
    try {
      const res = await fetch('/api/current-user');
      const user = await res.json();

      if (!user || !user.username) {
        window.location.href = '/login';
        return;
      }

      this.isFreeUser = user.plan === 'trial';
      this.isExpired = user.isExpired === true;

      if (this.isExpired) {
        this.showExpiredModal();
        return;
      }

      if (this.isFreeUser) {
        this.applyRestrictions();
      }
    } catch (err) {
      console.error('Free trial check failed:', err);
    }
  },

  // Apply blur to elements with class "blur-free"
  applyRestrictions() {
    document.querySelectorAll('.blur-free').forEach(el => {
      el.style.filter = 'blur(6px)';
      el.style.userSelect = 'none';
      el.style.pointerEvents = 'none';
      el.style.position = 'relative';
    });

    // Add lock overlay to elements with class "lock-free"
    document.querySelectorAll('.lock-free').forEach(el => {
      el.style.position = 'relative';
      el.setAttribute('disabled', true);
      el.style.opacity = '0.5';
      el.style.cursor = 'not-allowed';
      el.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showUpgradeModal();
        return false;
      };
    });
  },

  showUpgradeModal() {
    let modal = document.getElementById('upgradeModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'upgradeModal';
      modal.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.6);z-index:9999;
        display:flex;align-items:center;justify-content:center;
      `;
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          <div style="font-size:48px;margin-bottom:16px;">🔒</div>
          <h2 style="color:#2d3748;margin-bottom:8px;">Paid Feature</h2>
          <p style="color:#718096;margin-bottom:24px;">This feature is available on paid plans. Upgrade to unlock full access to all features.</p>
          <a href="https://tank-estimator-app.vercel.app/pricing" 
             style="display:inline-block;padding:12px 28px;background:#3182ce;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;margin-bottom:12px;">
            Upgrade Now
          </a>
          <br>
          <button onclick="document.getElementById('upgradeModal').remove()" 
                  style="background:none;border:none;color:#a0aec0;cursor:pointer;font-size:14px;margin-top:8px;">
            Maybe later
          </button>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      modal.style.display = 'flex';
    }
  },

  showExpiredModal() {
    document.body.innerHTML = `
      <div style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7fafc;">
        <div style="background:#fff;border-radius:16px;padding:40px;max-width:400px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
          <div style="font-size:48px;margin-bottom:16px;">⏰</div>
          <h2 style="color:#2d3748;margin-bottom:8px;">Trial Expired</h2>
          <p style="color:#718096;margin-bottom:24px;">Your 3-day free trial has ended. Upgrade to continue using Tank Estimator.</p>
          <a href="https://tank-estimator-app.vercel.app/pricing"
             style="display:inline-block;padding:12px 28px;background:#3182ce;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">
            Upgrade Now
          </a>
        </div>
      </div>
    `;
  }
};
