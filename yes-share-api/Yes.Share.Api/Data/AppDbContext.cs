using Microsoft.EntityFrameworkCore;
using Yes.Share.Api.Models;

namespace Yes.Share.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<SharedFile> SharedFiles { get; set; }
    public DbSet<FilePermission> FilePermissions { get; set; }
    public DbSet<SystemLog> SystemLogs { get; set; }
    public DbSet<PublishPost> PublishPosts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();
        
        modelBuilder.Entity<SharedFile>()
            .HasOne(f => f.Uploader)
            .WithMany()
            .HasForeignKey(f => f.UploaderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FilePermission>()
            .HasOne(p => p.SharedFile)
            .WithMany(f => f.Permissions)
            .HasForeignKey(p => p.SharedFileId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SharedFile>()
            .HasOne(f => f.Parent)
            .WithMany(f => f.Children)
            .HasForeignKey(f => f.ParentId)
            .OnDelete(DeleteBehavior.Cascade); // Delete folder deletes children

        modelBuilder.Entity<PublishPost>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PublishPost>()
            .Property(p => p.TextFormat)
            .HasMaxLength(32);

        modelBuilder.Entity<PublishPost>()
            .Property(p => p.CodeLanguage)
            .HasMaxLength(64);

        modelBuilder.Entity<PublishPost>()
            .HasIndex(p => p.CreatedAt);
    }
}
