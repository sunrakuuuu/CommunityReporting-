namespace CommunityReport.Api.Models;

public class Comment
{
    public int Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Foreign keys
    public int ReportId { get; set; }
    public int UserId { get; set; }

    // Navigation properties (optional)
    public string? UserName { get; set; }
}