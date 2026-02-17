// backend/Program.cs
using Microsoft.EntityFrameworkCore;
using CommunityReport.Api.Data;
using CommunityReport.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// Add CORS (like cors() in Express)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Add SQLite database (like mongoose.connect())
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=../../database/communityreports.db"));

var app = builder.Build();

// Use CORS
app.UseCors("AllowReactApp");

// Create database if it doesn't exist
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}

// ========== API ROUTES (Like Express routes) ==========

// GET all reports - like app.get('/api/reports')
app.MapGet("/api/reports", async (AppDbContext db) =>
{
    var reports = await db.Reports.ToListAsync();
    return Results.Ok(reports);
});

// GET single report by id - like app.get('/api/reports/:id')
app.MapGet("/api/reports/{id}", async (int id, AppDbContext db) =>
{
    var report = await db.Reports.FindAsync(id);
    return report is not null ? Results.Ok(report) : Results.NotFound();
});

// POST create new report - like app.post('/api/reports')
app.MapPost("/api/reports", async (Report report, AppDbContext db) =>
{
    report.CreatedAt = DateTime.UtcNow;
    db.Reports.Add(report);
    await db.SaveChangesAsync();
    return Results.Created($"/api/reports/{report.Id}", report);
});

// PUT update report - like app.put('/api/reports/:id')
app.MapPut("/api/reports/{id}", async (int id, Report updatedReport, AppDbContext db) =>
{
    var report = await db.Reports.FindAsync(id);
    if (report is null) return Results.NotFound();

    report.Title = updatedReport.Title;
    report.Description = updatedReport.Description;
    report.Category = updatedReport.Category;
    report.Location = updatedReport.Location;
    report.Status = updatedReport.Status;
    report.ImageURl = updatedReport.ImageURl;

    await db.SaveChangesAsync();
    return Results.Ok(report);
});

// DELETE report - like app.delete('/api/reports/:id')
app.MapDelete("/api/reports/{id}", async (int id, AppDbContext db) =>
{
    var report = await db.Reports.FindAsync(id);
    if (report is null) return Results.NotFound();

    db.Reports.Remove(report);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Report deleted successfully" });
});


// ========== USER ROUTES ==========

app.MapGet("/api/users", async (AppDbContext db) =>
{
    var users = await db.Users.ToListAsync();

    var usersWithoutPasswords = users.Select(u => new { u.Id, u.Username });
    return Results.Ok(usersWithoutPasswords);
});

app.MapGet("/api/users/{id}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound(new { message = "User not found!" });

    return Results.Ok(new { user.Id, user.Username });
});

app.MapPost("/api/users/register", async (User newUser, AppDbContext db, ILogger<Program> logger) =>
{
    try
    {
        var existingUser = await db.Users.FirstOrDefaultAsync(u => u.Username == newUser.Username);
        if (existingUser != null)
        {
            return Results.BadRequest(new { message = "User name is already exists" });
        }

        if (string.IsNullOrWhiteSpace(newUser.Username) || string.IsNullOrWhiteSpace(newUser.Password))
        {
            return Results.BadRequest(new { message = "Username and Password are required!" });
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

app.MapDelete("/api/user/{id}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();

    db.Users.Remove(user);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "User deleted successfully" });
});

// ========== ADVANCED LIKE ROUTES (with user tracking) ==========

// Like a report (with user tracking)
app.MapPost("/api/reports/{id}/like", async (int id, HttpContext httpContext, AppDbContext db, ILogger<Program> logger) =>
{
    try
    {
        // Get user ID from request (you'd get this from JWT token in real app)
        // For now, we'll assume user ID is passed in header
        if (!httpContext.Request.Headers.TryGetValue("X-User-Id", out var userIdValue) ||
            !int.TryParse(userIdValue, out int userId))
        {
            return Results.BadRequest(new { message = "User ID is required" });
        }

        var report = await db.Reports.FindAsync(id);
        if (report is null)
        {
            return Results.NotFound(new { message = "Report not found" });
        }

        // Check if user already liked this report
        var existingLike = await db.Likes
            .FirstOrDefaultAsync(l => l.ReportId == id && l.UserId == userId);

        if (existingLike != null)
        {
            return Results.BadRequest(new { message = "You already liked this report" });
        }

        // Create like record
        var like = new Like
        {
            ReportId = id,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        // Increment report like count
        report.LikeCount++;

        db.Likes.Add(like);
        await db.SaveChangesAsync();

        logger.LogInformation("User {UserId} liked report {ReportId}", userId, id);

        return Results.Ok(new
        {
            message = "Report liked successfully",
            likeCount = report.LikeCount
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error liking report {Id}", id);
        return Results.Problem("Failed to like report");
    }
});

// Unlike a report (with user tracking)
app.MapDelete("/api/reports/{id}/like", async (int id, HttpContext httpContext, AppDbContext db, ILogger<Program> logger) =>
{
    try
    {
        // Get user ID from request
        if (!httpContext.Request.Headers.TryGetValue("X-User-Id", out var userIdValue) ||
            !int.TryParse(userIdValue, out int userId))
        {
            return Results.BadRequest(new { message = "User ID is required" });
        }

        var report = await db.Reports.FindAsync(id);
        if (report is null)
        {
            return Results.NotFound(new { message = "Report not found" });
        }

        // Find and remove the like
        var like = await db.Likes
            .FirstOrDefaultAsync(l => l.ReportId == id && l.UserId == userId);

        if (like == null)
        {
            return Results.BadRequest(new { message = "You haven't liked this report" });
        }

        // Decrement report like count
        if (report.LikeCount > 0)
        {
            report.LikeCount--;
        }

        db.Likes.Remove(like);
        await db.SaveChangesAsync();

        logger.LogInformation("User {UserId} unliked report {ReportId}", userId, id);

        return Results.Ok(new
        {
            message = "Report unliked successfully",
            likeCount = report.LikeCount
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error unliking report {Id}", id);
        return Results.Problem("Failed to unlike report");
    }
});

// Check if user liked a report
app.MapGet("/api/reports/{id}/liked", async (int id, HttpContext httpContext, AppDbContext db) =>
{
    if (!httpContext.Request.Headers.TryGetValue("X-User-Id", out var userIdValue) ||
        !int.TryParse(userIdValue, out int userId))
    {
        return Results.Ok(new { liked = false });
    }

    var like = await db.Likes
        .FirstOrDefaultAsync(l => l.ReportId == id && l.UserId == userId);

    return Results.Ok(new { liked = like != null });
});

// ========== COMMENT ROUTES ==========

// GET all comments for a report
app.MapGet("/api/reports/{reportId}/comments", async (int reportId, AppDbContext db) =>
{
    var comments = await db.Comments
        .Where(c => c.ReportId == reportId)
        .OrderByDescending(c => c.CreatedAt)
        .ToListAsync();

    return Results.Ok(comments);
});

// GET single comment
app.MapGet("/api/comments/{id}", async (int id, AppDbContext db) =>
{
    var comment = await db.Comments.FindAsync(id);
    return comment is not null ? Results.Ok(comment) : Results.NotFound();
});

// POST create new comment
app.MapPost("/api/reports/{reportId}/comments", async (int reportId, Comment newComment, HttpContext httpContext, AppDbContext db, ILogger<Program> logger) =>
{
    try
    {
        // Get user info from request
        if (!httpContext.Request.Headers.TryGetValue("X-User-Id", out var userIdValue) ||
            !int.TryParse(userIdValue, out int userId))
        {
            return Results.BadRequest(new { message = "User ID is required" });
        }

        var username = httpContext.Request.Headers["X-User-Name"].ToString();

        // Check if report exists
        var report = await db.Reports.FindAsync(reportId);
        if (report is null)
        {
            return Results.NotFound(new { message = "Report not found" });
        }

        // Validate content
        if (string.IsNullOrWhiteSpace(newComment.Content))
        {
            return Results.BadRequest(new { message = "Comment content is required" });
        }

        // Create comment
        var comment = new Comment
        {
            Content = newComment.Content,
            ReportId = reportId,
            UserId = userId,
            UserName = username,
            CreatedAt = DateTime.UtcNow
        };

        db.Comments.Add(comment);
        await db.SaveChangesAsync();

        logger.LogInformation("Comment added to report {ReportId} by user {UserId}", reportId, userId);

        return Results.Created($"/api/comments/{comment.Id}", comment);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error creating comment");
        return Results.Problem("Failed to create comment");
    }
});

// PUT update comment
app.MapPut("/api/comments/{id}", async (int id, Comment updatedComment, HttpContext httpContext, AppDbContext db, ILogger<Program> logger) =>
{
    try
    {
        // Get user ID
        if (!httpContext.Request.Headers.TryGetValue("X-User-Id", out var userIdValue) ||
            !int.TryParse(userIdValue, out int userId))
        {
            return Results.BadRequest(new { message = "User ID is required" });
        }

        var comment = await db.Comments.FindAsync(id);
        if (comment is null)
        {
            return Results.NotFound(new { message = "Comment not found" });
        }

        // Check if user owns the comment
        if (comment.UserId != userId)
        {
            return Results.Unauthorized();
        }

        // Update comment
        comment.Content = updatedComment.Content;
        comment.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        logger.LogInformation("Comment {Id} updated", id);

        return Results.Ok(comment);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error updating comment {Id}", id);
        return Results.Problem("Failed to update comment");
    }
});

// DELETE comment
app.MapDelete("/api/comments/{id}", async (int id, HttpContext httpContext, AppDbContext db, ILogger<Program> logger) =>
{
    try
    {
        // Get user ID
        if (!httpContext.Request.Headers.TryGetValue("X-User-Id", out var userIdValue) ||
            !int.TryParse(userIdValue, out int userId))
        {
            return Results.BadRequest(new { message = "User ID is required" });
        }

        var comment = await db.Comments.FindAsync(id);
        if (comment is null)
        {
            return Results.NotFound(new { message = "Comment not found" });
        }

        // Check if user owns the comment
        if (comment.UserId != userId)
        {
            return Results.Unauthorized();
        }

        db.Comments.Remove(comment);
        await db.SaveChangesAsync();
        logger.LogInformation("Comment {Id} deleted", id);

        return Results.Ok(new { message = "Comment deleted successfully" });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error deleting comment {Id}", id);
        return Results.Problem("Failed to delete comment");
    }
});

// GET comment count for a report
app.MapGet("/api/reports/{reportId}/comments/count", async (int reportId, AppDbContext db) =>
{
    var count = await db.Comments.CountAsync(c => c.ReportId == reportId);
    return Results.Ok(new { count });
});

// Health check endpoint
app.MapGet("/api/health", () => Results.Ok(new { status = "Server is running!" }));

app.Run();