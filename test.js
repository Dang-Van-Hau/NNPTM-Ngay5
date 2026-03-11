const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const express = require("express");

const roleRoutes = require("./roleRoutes");
const userRoutes = require("./userRoutes");

const app = express();
app.use(express.json());
app.use("/roles", roleRoutes);
app.use("/users", userRoutes);

let server;
let mongoServer;
let BASE;
let roleId;
let userId;

async function request(method, path, body) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function assert(condition, msg) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  PASS: ${msg}`);
}

async function main() {
  console.log("Starting MongoDB Memory Server...");
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log("Connected to in-memory MongoDB\n");

  server = app.listen(0, () => {
    const port = server.address().port;
    BASE = `http://localhost:${port}`;
    console.log(`Test server running on port ${port}\n`);
  });

  await new Promise((r) => server.on("listening", r));

  // ===================== ROLE CRUD =====================
  console.log("=== 1. ROLE CRUD ===");

  // Create Role
  console.log("\n[POST /roles] Create role");
  let res = await request("POST", "/roles", { name: "admin", description: "Administrator" });
  assert(res.status === 201, `Status 201 (got ${res.status})`);
  assert(res.data.name === "admin", "name = admin");
  assert(res.data.description === "Administrator", "description = Administrator");
  assert(res.data.isDeleted === false, "isDeleted = false");
  roleId = res.data._id;

  // Create another role
  res = await request("POST", "/roles", { name: "user", description: "Regular user" });
  assert(res.status === 201, "Second role created");
  const roleId2 = res.data._id;

  // Create duplicate role (should fail)
  console.log("\n[POST /roles] Create duplicate role");
  res = await request("POST", "/roles", { name: "admin" });
  assert(res.status === 400, `Duplicate rejected with 400 (got ${res.status})`);

  // Get all roles
  console.log("\n[GET /roles] Get all roles");
  res = await request("GET", "/roles");
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.length === 2, `Got 2 roles (got ${res.data.length})`);

  // Get role by ID
  console.log("\n[GET /roles/:id] Get role by ID");
  res = await request("GET", `/roles/${roleId}`);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.name === "admin", "name = admin");

  // Get role by invalid ID
  console.log("\n[GET /roles/:id] Get role by invalid ID");
  res = await request("GET", `/roles/000000000000000000000000`);
  assert(res.status === 404, `Status 404 (got ${res.status})`);

  // Update role
  console.log("\n[PUT /roles/:id] Update role");
  res = await request("PUT", `/roles/${roleId}`, { description: "Super Admin" });
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.description === "Super Admin", "description updated");

  // Delete role (soft delete)
  console.log("\n[DELETE /roles/:id] Soft delete role");
  res = await request("DELETE", `/roles/${roleId2}`);
  assert(res.status === 200, `Status 200 (got ${res.status})`);

  // Verify soft delete - getAllRoles should return 1
  console.log("\n[GET /roles] Verify soft delete");
  res = await request("GET", "/roles");
  assert(res.data.length === 1, `Only 1 role visible after soft delete (got ${res.data.length})`);

  // Verify get deleted role by ID returns 404
  res = await request("GET", `/roles/${roleId2}`);
  assert(res.status === 404, `Deleted role returns 404 (got ${res.status})`);

  // ===================== USER CRUD =====================
  console.log("\n=== 2. USER CRUD ===");

  // Create User
  console.log("\n[POST /users] Create user");
  res = await request("POST", "/users", {
    username: "john_doe",
    password: "123456",
    email: "john@example.com",
    fullName: "John Doe",
    role: roleId,
  });
  assert(res.status === 201, `Status 201 (got ${res.status})`);
  assert(res.data.username === "john_doe", "username = john_doe");
  assert(res.data.email === "john@example.com", "email correct");
  assert(res.data.fullName === "John Doe", "fullName correct");
  assert(res.data.status === false, "status default = false");
  assert(res.data.loginCount === 0, "loginCount default = 0");
  assert(res.data.avatarUrl === "https://i.sstatic.net/l60Hf.png", "avatarUrl default correct");
  assert(res.data.isDeleted === false, "isDeleted = false");
  userId = res.data._id;

  // Create second user
  res = await request("POST", "/users", {
    username: "jane_doe",
    password: "654321",
    email: "jane@example.com",
    role: roleId,
  });
  assert(res.status === 201, "Second user created");
  const userId2 = res.data._id;

  // Create third user (no role)
  res = await request("POST", "/users", {
    username: "bob_smith",
    password: "abcdef",
    email: "bob@example.com",
  });
  assert(res.status === 201, "Third user created (no role)");
  const userId3 = res.data._id;

  // Duplicate username should fail
  console.log("\n[POST /users] Duplicate username");
  res = await request("POST", "/users", {
    username: "john_doe",
    password: "xxx",
    email: "other@example.com",
  });
  assert(res.status === 400, `Duplicate username rejected (got ${res.status})`);

  // Duplicate email should fail
  console.log("\n[POST /users] Duplicate email");
  res = await request("POST", "/users", {
    username: "new_user",
    password: "xxx",
    email: "john@example.com",
  });
  assert(res.status === 400, `Duplicate email rejected (got ${res.status})`);

  // Get all users
  console.log("\n[GET /users] Get all users");
  res = await request("GET", "/users");
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.length === 3, `Got 3 users (got ${res.data.length})`);

  // Get all users with populate check
  assert(res.data[0].role !== null && typeof res.data[0].role === "object", "role is populated");

  // Get all users - query by username (includes)
  console.log("\n[GET /users?username=doe] Query by username (includes)");
  res = await request("GET", "/users?username=doe");
  assert(res.data.length === 2, `Found 2 users with 'doe' (got ${res.data.length})`);

  console.log("\n[GET /users?username=john] Query by username (includes)");
  res = await request("GET", "/users?username=john");
  assert(res.data.length === 1, `Found 1 user with 'john' (got ${res.data.length})`);

  console.log("\n[GET /users?username=xyz] Query by username (no match)");
  res = await request("GET", "/users?username=xyz");
  assert(res.data.length === 0, `Found 0 users with 'xyz' (got ${res.data.length})`);

  // Case insensitive search
  console.log("\n[GET /users?username=JOHN] Case insensitive search");
  res = await request("GET", "/users?username=JOHN");
  assert(res.data.length === 1, `Case insensitive: found 1 (got ${res.data.length})`);

  // Get user by ID
  console.log("\n[GET /users/:id] Get user by ID");
  res = await request("GET", `/users/${userId}`);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.username === "john_doe", "username correct");
  assert(typeof res.data.role === "object" && res.data.role.name === "admin", "role populated correctly");

  // Update user
  console.log("\n[PUT /users/:id] Update user");
  res = await request("PUT", `/users/${userId}`, { fullName: "John Updated" });
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.fullName === "John Updated", "fullName updated");

  // Soft delete user
  console.log("\n[DELETE /users/:id] Soft delete user");
  res = await request("DELETE", `/users/${userId3}`);
  assert(res.status === 200, `Status 200 (got ${res.status})`);

  // Verify soft delete
  console.log("\n[GET /users] Verify soft delete");
  res = await request("GET", "/users");
  assert(res.data.length === 2, `Only 2 users visible after soft delete (got ${res.data.length})`);

  res = await request("GET", `/users/${userId3}`);
  assert(res.status === 404, `Deleted user returns 404 (got ${res.status})`);

  // ===================== ENABLE / DISABLE =====================
  console.log("\n=== 3. POST /enable & /disable ===");

  // Enable user
  console.log("\n[POST /users/enable] Enable user with correct info");
  res = await request("POST", "/users/enable", {
    email: "john@example.com",
    username: "john_doe",
  });
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.status === true, "status = true");

  // Verify status persists
  res = await request("GET", `/users/${userId}`);
  assert(res.data.status === true, "status confirmed true via GET");

  // Enable with wrong email
  console.log("\n[POST /users/enable] Enable with wrong email");
  res = await request("POST", "/users/enable", {
    email: "wrong@example.com",
    username: "john_doe",
  });
  assert(res.status === 404, `Wrong info returns 404 (got ${res.status})`);

  // Enable with wrong username
  console.log("\n[POST /users/enable] Enable with wrong username");
  res = await request("POST", "/users/enable", {
    email: "john@example.com",
    username: "wrong_user",
  });
  assert(res.status === 404, `Wrong info returns 404 (got ${res.status})`);

  // Enable without required fields
  console.log("\n[POST /users/enable] Missing fields");
  res = await request("POST", "/users/enable", { email: "john@example.com" });
  assert(res.status === 400, `Missing username returns 400 (got ${res.status})`);

  res = await request("POST", "/users/enable", {});
  assert(res.status === 400, `Empty body returns 400 (got ${res.status})`);

  // Disable user
  console.log("\n[POST /users/disable] Disable user with correct info");
  res = await request("POST", "/users/disable", {
    email: "john@example.com",
    username: "john_doe",
  });
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.status === false, "status = false");

  // Verify status persists
  res = await request("GET", `/users/${userId}`);
  assert(res.data.status === false, "status confirmed false via GET");

  // Disable with wrong info
  console.log("\n[POST /users/disable] Disable with wrong info");
  res = await request("POST", "/users/disable", {
    email: "wrong@example.com",
    username: "john_doe",
  });
  assert(res.status === 404, `Wrong info returns 404 (got ${res.status})`);

  // ===================== GET USERS BY ROLE =====================
  console.log("\n=== 4. GET /roles/:id/users ===");

  console.log("\n[GET /roles/:id/users] Get users by role");
  res = await request("GET", `/roles/${roleId}/users`);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.length === 2, `2 users with admin role (got ${res.data.length})`);
  assert(res.data.every((u) => u.role._id === roleId), "All users have correct role");

  // Get users by non-existent role
  console.log("\n[GET /roles/:id/users] Non-existent role");
  res = await request("GET", `/roles/000000000000000000000000/users`);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.length === 0, `0 users for unknown role (got ${res.data.length})`);

  // ===================== DONE =====================
  console.log("\n========================================");
  console.log("ALL TESTS PASSED!");
  console.log("========================================");

  server.close();
  await mongoose.disconnect();
  await mongoServer.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
