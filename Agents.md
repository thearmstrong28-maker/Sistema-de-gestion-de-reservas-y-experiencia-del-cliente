# AGENTS.md

## 📌 Project Overview

This project consists of a web-based **Restaurant Reservation and Customer Experience Management System**. The goal is to provide an efficient, secure, and user-friendly platform to manage reservations, tables, and customer data, improving operational workflow and customer satisfaction.

---

## 🛠️ Technology Stack

### Frontend

* **Framework:** React
* **Languages:** JavaScript & TypeScript
* **Styling:** Minimalist design principles (clean UI, neutral colors, high usability)
* **Compatibility:** Must work across all modern browsers (Chrome, Firefox, Edge, Safari)

### Backend

* **Runtime:** Node.js
* **Architecture:** RESTful API

### Database

* **Database System:** MongoDB
* **Type:** NoSQL, document-based
* **Purpose:** Store reservations, customer data, tables, and operational history

---

## 🎨 UI/UX Guidelines

* The interface must be:

  * Minimalist
  * Clean and uncluttered
  * Easy to use (no technical knowledge required)
  * Focused on usability and speed

* Design rules:

  * Use neutral color palettes (white, gray, soft tones)
  * Avoid unnecessary visual elements
  * Maintain consistent spacing and typography
  * Prioritize accessibility and readability

---

## ⚙️ Core Functionalities

The system must implement the following features:

### Reservation Management

* Create reservations
* Modify reservations
* Cancel reservations

### Table Management

* Assign tables based on availability and capacity
* View table availability by date and time

### Customer Management

* Register customers
* Store customer preferences
* Maintain visit history

### Operational Features

* Waiting list management
* No-show tracking
* Basic operational reports (daily occupancy, frequent customers)

---

## 👥 User Roles

* **Administrator:** System configuration and management
* **Host/Receptionist:** Reservation and table handling
* **Manager:** Access to reports and decision-making tools
* **Customer:** Reservation requests

---

## 🧪 Testing Requirements

The system must include:

* Functional testing (all features must work correctly)
* Usability testing (intuitive for non-technical users)
* Performance testing (acceptable response time)
* Acceptance testing with real users

---

## 🔒 Security Guidelines

* Use HTTPS for all communications
* Implement secure password hashing
* Validate and sanitize all inputs
* Prevent common vulnerabilities (XSS, SQL/NoSQL injection, CSRF)
* Implement role-based access control (RBAC)

---

## 📏 Development Guidelines

* Follow clean code principles
* Use modular and scalable architecture
* Maintain clear separation of concerns (frontend, backend, database)
* Use meaningful variable and function names
* Write reusable and maintainable components in React

---

## 🚫 Restrictions

* Do not implement features outside the defined MVP scope (e.g., payments, mobile app, advanced analytics)
* Do not modify database schema without proper validation
* Avoid unnecessary dependencies

---

## 🔄 Development Process

* Follow an **incremental development approach (RUP-inspired)**
* Deliver functional modules in iterations
* Validate features continuously with users

---

## 📦 General Principles

* Prioritize simplicity over complexity
* Ensure system reliability and maintainability
* Focus on real user needs (restaurant workflow)
* Minimize risks through controlled scope

---

## ✅ Goal

Deliver a secure, scalable, and user-centered web system that efficiently manages restaurant reservations and enhances customer experience.
