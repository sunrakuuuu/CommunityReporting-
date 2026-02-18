using Microsoft.EntityFrameworkCore;
using CommunityReport.Api.Data;
using CommunityReport.Api.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
        )
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(
        "Data Source=../../database/communityreports.db"
        ));

var app = builder.Build();
app.UseCors("AllowReactApp");

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.
    GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}

// ============ API Routes ============

// Get all the Reports
app.MapGet("/api/reports", async (AppDbContext db) =>
{
    var reports = await db.Reports.ToListAsync();
    return Results.Ok(reports);
});

//Get the specific Report
app.MapGet("/api/reports/{id}", async (int id, AppDbContext db) =>
{
    var report = await db.Reports.FindAsync(id);
    return report is not null
     ? Results.Ok(report)
     : Results
     .NotFound(new { message = "Report not Found" });
});

// Post Create new Report
app.MapPost("/api/reports", async (Report report, AppDbContext db) =>
{
    report.CreatedAt = DateTime.UtcNow;
    db.Reports.Add(report);
    await db.SaveChangesAsync();
    return Results
    .Created($"/api/report/{report.Id}", report);
});

//Put Update the Report
app.MapPut("/api/reports/{id}", async (int id, Report updateReport, AppDbContext db) =>
{
    var report = await db.Reports.FindAsync(id);
    if (report is null) return Results
    .NotFound(new { message = "Cannot find the report" });

    report.Title = updateReport.Title;
    report.Description = updateReport.Description;
    report.Category = updateReport.Category;
    report.Location = updateReport.Location;
    report.Status = updateReport.Status;
    report.ImageURl = updateReport.ImageURl;

    await db.SaveChangesAsync();
    return Results.Ok(report);
});

// Delete Deleting the report
app.MapDelete("/api/reports/{id}", async (int id, AppDbContext db) =>
{
    var report = await db.Reports.FindAsync(id);
    if (report is null) return Results.NotFound(new
    {
        message = "Report not found"
    });

    db.Reports.Remove(report);
    await db.SaveChangesAsync();
    return Results.Ok(new
    {
        message = "Report deleted successfully"
    });
});

// ========= User Routes =========

//Get all of the users
app.MapGet("/api/users", async (AppDbContext db) =>
{
    var users = await db.Users.ToListAsync();

    var userWithoutPassword = users
    .Select(u => new { u.Id, u.Username });
    return Results.Ok(userWithoutPassword);
});

//Get the specific user based on the Id
app.MapGet("/api/users/{id}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results
    .NotFound(new { message = "User not found" });

    return Results.Ok(new { user.Id, user.Username });
});

//Post Register the user
app.MapPost("/api/users/register", async (User newUser, AppDbContext db, ILogger<Program> logger) =>
{
    try
    {
        var existingUser = await
        db.Users.FirstOrDefaultAsync
        (u => u.Username == newUser.Username);

        if (existingUser is not null)
            return Results.BadRequest(new
            {
                message = "User is already existed"
            });

        if (string
        .IsNullOrWhiteSpace
        (newUser.Username) ||
        string
        .IsNullOrWhiteSpace
        (newUser.Password))
        {
            return Results
            .BadRequest(new
            {
                message = "Username and Password is Required"
            });
        }

        db.Users.Add(newUser);
        await db.SaveChangesAsync();

        logger.LogInformation("User registered: {username}", newUser.Username);

        return Results.Created($"/api/users/{newUser.Id}", new
        {
            id = newUser.Id,
            username = newUser.Username
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error registering the user");
        return Results.Problem("Failed to register the user");
    }
});

//Post Login the user
app.MapPost("/api/users/login", async (User loginUser, AppDbContext db, ILogger<Program> logger) =>
{
    try
    {
        var user = await db.Users.FirstOrDefaultAsync(u =>
        u.Username == loginUser.Username && u.Password == loginUser.Password);

        if (user is null)
        {
            return Results.Unauthorized();
        }

        logger.LogInformation("User logged in: {Username}", user.Username);

        return Results.Ok(new
        {
            id = user.Id,
            username = user.Username,
            message = "Login Successful"
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error Login");
        return Results.Problem("Failed to login");
    }
});

//Delete delete user
app.MapDelete("/api/user/{id}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();

    db.Users.Remove(user);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "User deleted successfully" });
});


app.Run();