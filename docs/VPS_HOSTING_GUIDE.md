# Server & Hosting Architecture Proposal: Minax Music

**Prepared for:** Client & Stakeholders  
**Document Type:** Infrastructure & Hosting Guide (Technical & Business Overview)  
**Date:** September 2026  
**Status:** Approved Configuration Proposal  

---

## 1. Executive Summary

To operate the **Minax Music Mobile Application** with real-time online song streaming, dynamic home screen banners, administrative controls, and over-the-air updates, a secure and continuous cloud backend is required.

Instead of purchasing multiple fragmented, expensive cloud subscriptions (such as separate cloud databases, media storage buckets, and serverless compute platforms), this project utilizes an **All-in-One Virtual Private Server (VPS)** architecture. 

A single VPS functions as a dedicated cloud computer that hosts **100% of your backend ecosystem** at a low, predictable fixed monthly cost.

---

## 2. Why Do We Need a VPS? (The "All-in-One" Advantage)

A VPS eliminates third-party vendor lock-in and avoids recurring micro-billing from multiple cloud providers. With **one VPS**, the following services are bundled together:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        YOUR SINGLE HOSTINGER VPS                       │
│                                                                        │
│  ┌────────────────────┐  ┌───────────────────┐  ┌───────────────────┐  │
│  │  1. Admin Website  │  │  2. Mobile API    │  │  3. MP3 Storage   │  │
│  │  Next.js Dashboard │  │  Endpoints / Auth │  │  50GB+ NVMe SSD   │  │
│  └────────────────────┘  └───────────────────┘  └───────────────────┘  │
│                                                                        │
│  ┌────────────────────┐  ┌───────────────────┐  ┌───────────────────┐  │
│  │  4. Database       │  │  5. Free SSL      │  │  6. Audio Stream  │  │
│  │  Embedded SQLite   │  │  HTTPS Encrypted  │  │  High Bandwidth   │  │
│  └────────────────────┘  └───────────────────┘  └───────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### What You Get in One Server (No Additional Tools Required):

1. **Admin Web Dashboard & Management Portal**:
   - Secure web interface accessible via browser to upload songs, manage featured carousel banners, monitor app users, and manage app versions.
2. **Mobile Backend API**:
   - The fast, secure engine that serves metadata, authentication tokens, and user playback history to the Android/iOS app.
3. **Dedicated High-Speed Audio & Media Storage**:
   - All MP3 audio tracks and promotional banner graphics are stored directly on the ultra-fast NVMe solid-state drive. **No need to pay separate Amazon AWS S3 or Cloudflare storage bills.**
4. **Embedded Database**:
   - A high-performance, zero-maintenance database engine running locally on the server. **No need to pay monthly managed database fees (e.g., Supabase / MongoDB Atlas).**
5. **Complimentary Enterprise SSL Security (HTTPS)**:
   - Automated, recurring SSL encryption certificates (via Let's Encrypt / Certbot) securing all communication between the mobile app, admin panel, and server. **$0 / year in SSL certificate costs.**
6. **High-Speed Audio Streaming Delivery**:
   - Generous monthly data transfer limits allowing thousands of users to stream high-bitrate audio simultaneously with near-zero latency.

---

## 3. Recommended Server Configuration

To ensure zero downtime, fast Next.js builds, and smooth playback for thousands of active listeners, the following server specifications are recommended:

| Specification | Minimum Required | **Recommended (Hostinger KVM 1)** |
| :--- | :--- | :--- |
| **vCPU** | 1 Core | **1 vCPU Core** |
| **RAM (Memory)** | 2 GB | **4 GB RAM** *(Ensures smooth builds & zero crashes)* |
| **Disk Storage** | 20 GB SSD | **50 GB NVMe SSD** *(Stores 5,000 to 8,000+ full MP3 songs)* |
| **Bandwidth** | 1 TB / mo | **4 TB (4,000 GB) / mo** *(Hundreds of thousands of streams/month)* |
| **Operating System** | Linux Ubuntu | **Ubuntu 24.04 LTS (64-bit)** |
| **Server Location** | Any | **India (Mumbai Data Center)** *(Lowest latency & instant song loading)* |
| **Backup System** | Optional | **Automated Weekly Backups Included** |

---

## 4. Recommended Platform & Pricing

We recommend **Hostinger VPS Hosting** for its proven reliability, ultra-fast NVMe storage, beginner-friendly control panel (hPanel), and cost efficiency.

- **Hosting Platform Link:** [https://www.hostinger.com/vps-hosting#pricing](https://www.hostinger.com/vps-hosting#pricing)
- **Recommended Plan:** **KVM 1** (or KVM 2 for larger enterprise audio catalogs)

### Estimated Order Summary Breakdown (Annual Plan):
| Item | Standard Price | Discounted Price |
| :--- | :--- | :--- |
| **KVM 1 Plan (12-Month Period)** | ~~$233.88~~ | **$83.88** (~$6.99/mo) |
| **Domain Registration (1 Year)** | ~~$63.99~~ | **$0.00 (FREE)** |
| **Domain Privacy Protection** | ~~$10.00~~ | **$0.00 (FREE)** |
| **Estimated Taxes / Fees** | — | **~$15.10** |
| **Total Investment (Full 1st Year)** | ~~$312.97~~ | **~$98.98 Total** *(approx. ₹8,200 INR for entire year)* |

- **Money-Back Guarantee:** 30-Day 100% Money-Back Guarantee provided directly by Hostinger.

---

## 5. Step-by-Step Purchase Guide (For Client)

Please follow these straightforward steps to purchase and provision the server:

### Step 1: Open the Pricing Page
Visit the official pricing link:  
👉 **[https://www.hostinger.com/vps-hosting#pricing](https://www.hostinger.com/vps-hosting#pricing)**

### Step 2: Choose the Plan
1. Locate the **KVM 1** plan ($6.49/mo with 4 GB RAM & 50 GB NVMe Storage).
2. Click **"Choose Plan"** / **"Add to Cart"**.

### Step 3: Select the Billing Period
- Select the **12-Month Period** (or 24/48 months for higher discounts).
- Note that the 12+ month plan includes a **Free Domain Name** and **Free Privacy Protection**.

### Step 4: Account Creation & Payment
1. Enter your business email address to register your Hostinger account.
2. Select your preferred payment method (Credit/Debit Card, UPI, PayPal, Net Banking, or Crypto).
3. Review the order total (~$98.98) and click **"Continue"** / **"Submit Secure Payment"**.

### Step 5: Initial Server Setup Wizard (Critical Settings)
Once payment is completed, Hostinger will prompt you with the screen: *"Choose what to install (Operating system, control panel, application)"*. Please configure the following:

1. **Location / Data Center**:  
   - **Select India (Mumbai)** as the data center location. This ensures the lowest latency and lightning-fast audio buffering for users in India.
2. **What to Install (Operating System)**:  
   - Click **`Ubuntu`** ➔ Select **`Ubuntu 24.04 LTS`** (or `Ubuntu 22.04 LTS` / `Ubuntu 26.04 LTS`).  
   - Click **"Confirm"**.  
   *(This provides the cleanest, fastest performance with 100% of server RAM dedicated to the music app).*
   - **Alternative Web Panels:** If a visual web dashboard is preferred instead of a clean OS, select **`Coolify`** or **`CloudPanel`** (avoid legacy panels like cPanel/Plesk/CyberPanel which consume excessive RAM).
3. **Set Root Password**:  
   - Create a strong, secure server root password and save it in a safe place.

---

## 6. What Information to Share with the Developer

Once the server setup is complete, please share the following details with the engineering team to deploy the application:

1. **Hostinger VPS IP Address** (e.g., `194.163.xxx.xxx`)
2. **Server SSH Root Password** (created in Step 5)
3. **Domain Name Access** (DNS management to point `api.yourdomain.com` or `admin.yourdomain.com` to the server IP)

---

## 7. Technical Implementation Checklist (Handled by Engineering Team)

Once credentials are provided, the development team will execute the complete production deployment:

- [x] **Server Security & Firewall**: SSH key hardening, UFW firewall configuration (Ports 80, 443, 22).
- [x] **Node.js & PM2 Runtime**: Node.js 20 LTS environment with zero-downtime auto-restart process manager.
- [x] **Database & Migrations**: Automated Prisma client setup and database initialization.
- [x] **Nginx Reverse Proxy & Large File Uploads**: Optimized proxy handling audio stream buffers and large MP3 file uploads (up to 100MB per file).
- [x] **Free HTTPS/SSL Certificate**: Certbot automation with auto-renewing SSL encryption.
- [x] **Mobile App Endpoint Integration**: Linking the React Native production APK/AAB builds to the live server URL.

---

### Summary
With a single **Hostinger KVM 1 VPS (~$6.49/mo)**, you gain an enterprise-grade, independent infrastructure capable of hosting the entire Minax Music ecosystem with no hidden fees or extra cloud subscriptions.
