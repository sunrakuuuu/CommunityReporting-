namespace CommunityReport.Api.Models;

public class Report
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? ImageURl { get; set; }

    public int? UserId { get; set; }
    public string? UserName { get; set; }

    // Add like count
    public int LikeCount { get; set; } = 0;
}