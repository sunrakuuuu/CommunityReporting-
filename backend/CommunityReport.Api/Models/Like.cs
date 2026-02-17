namespace CommunityReport.Api.Models;

public class Like
{
    public int Id { get; set; }
    public int ReportId { get; set; }
    public int UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties (optional)
    public Report? Report { get; set; }
    public User? User { get; set; }
}