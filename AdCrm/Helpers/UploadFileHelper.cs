using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.IO;
using AdCrm.Models;

namespace AdCrm
{
    public class UploadFileHelper
    {
        BuildingEntities db;

        public UploadFileHelper(BuildingEntities DB)
        {
            this.db = DB;
        }

        public Models.File UploadFiles(int FileID, int? FolderID, out int Code, out string Message, bool Watermark = true)
        {
            HttpRequest Request = HttpContext.Current.Request;
            User user = Request.RequestContext.HttpContext.CurrentUser();

            if (Request.Files.Count < 1)
            {
                Code = 202;
                Message = "No file posted.";
                return null;
            }
            BuildingEntities db = this.db as BuildingEntities;
            HttpPostedFile item = Request.Files[0];
            Models.File file = null;
            Models.Folder folder = null;
            string path, folderName = "UploadedFiles";
            string fname = item.FileName.ToLower();
            if (fname == "image_file")
            {
                fname = string.Format("img_{0:yyyyMMddHHmmss}.png", DateTime.Now);
            }
            string ext = System.IO.Path.GetExtension(fname).Replace(".", string.Empty).ToLower();
            //FileType ft = db.FileTypes.FirstOrDefault(val => val.Allow && val.Extension.Contains(ext) && val.Watermark == Watermark);
            //ft = ft ?? db.FileTypes.FirstOrDefault(val => val.Allow && val.Extension.Contains(ext));
            DirectoryInfo di;

            if (user == null)
            {
                user = db.Users.FirstOrDefault(val => val.RoleID == (int)RolesEnum.Admin);
            }

            if (FolderID > 0)
            {
                folder = db.Folders.FirstOrDefault(val => val.ID == FolderID);
                if (folder == null)
                {
                    Code = 202;
                    Message = "Invalid folder";
                    return null;
                }
                if (folder.Url.IsNullOrEmpty())
                {
                    folder.FillUrl();
                }
                folderName = folder.Url;
            }

            //if (ft == null)
            //{
            //    Code = 202;
            //    Message = "Incorrect extension";
            //    return null;
            //}

            //if (ft.MaxSize > 0 && ft.MaxSize * 1024 < item.ContentLength)
            //{
            //    Code = 202;
            //    Message = "Incorrect size";
            //    return null;
            //}

            if (FileID > 0)
            {
                file = db.Files.FirstOrDefault(val => val.ID == FileID);
            }

            if (file == null)
            {
                file = new Models.File();
                db.Files.AddObject(file);
            }
            else
            {
                file.RemoveFile();
            }

            path = string.Format("{0}/{1}", HttpRuntime.AppDomainAppPath, folderName);
            di = new DirectoryInfo(path);

            if (!di.Exists)
            {
                di.Create();
            }

            file.Name = fname;
            file.Url = string.Format("{0}/{1}", folderName, this.GetNextFileName(fname, path));
            //file.TypeID = ft.ID;
            file.CreateDate = file.ChangeDate = DateTime.Now;
            file.CreatorID = file.ChangerID = user.ID;
            if (FolderID > 0)
            {
                file.FolderID = FolderID;
            }
            if (folder != null && folder.ProjectID.HasValue)
            {
                ProjectFile pfile = new ProjectFile() { File = file, ProjectID = folder.ProjectID.Value };
                db.ProjectFiles.AddObject(pfile);

                List<int?> taskIDs = db.ProjectFiles.Where(val => val.File.FolderID == folder.ID).Select(val => val.ProjectTaskID).Distinct().ToList();
                if (taskIDs.Count == 1)
                    pfile.ProjectTaskID = taskIDs.First();
            }
            path = file.RealPath;

            //if (Watermark && ft.Watermark)
            //{
            //    string wpath = Settings.WatermarkImage;
            //    wpath = wpath.StartsWith("/") ? Path.Combine(HttpRuntime.AppDomainAppPath, wpath.Trim('/')) : wpath;
            //    var bmp3 = new System.Drawing.Bitmap(wpath);

            //    MemoryStream ms = new MemoryStream();
            //    Helpers.ImageHelper.AddWaterMarkCenter(item.InputStream, bmp3, ms);
            //    ms.Flush();

            //    var bmp1 = new System.Drawing.Bitmap(ms);
            //    Helpers.ImageHelper.CreateThumbnailImage(bmp1, path, 1024, -1, -1, 70);
            //    bmp1.Dispose();

            //    ms.Dispose();

            //    bmp3.Dispose();

            //    path = Path.Combine(ft.Folder, this.GetNextFileName(item.FileName, folder));
            //    file.OriginUrl = path.Replace('\\', '/');
            //    path = file.OriginPath;
            //}

            //if (ext == "jpg" || ext == "png")
            //{
            //    try
            //    {
            //        var bmp1 = new System.Drawing.Bitmap(item.InputStream);
            //        Helpers.ImageHelper.CreateThumbnailImage(bmp1, path, 1024, -1, -1, 70);
            //        bmp1.Dispose();
            //    }
            //    catch
            //    {
            //        item.SaveAs(path);
            //    }
            //}
            //else
            //{
            item.SaveAs(path);
            //}

            db.SaveChanges();

            Code = 200;
            Message = string.Empty;

            return file;
        }

        public virtual string GetNextFileName(string FileName, string FolderPath)
        {
            Random rand = new Random();
            int code = Math.Abs(FileName.GetHashCode());
            string ext = System.IO.Path.GetExtension(FileName);
            string name = null;
            System.IO.FileInfo fi;

            for (int i = 0; i < 10; i++)
            {
                name = string.Format("{0}_{1}{2}{3}", DateTime.Now.ToString("yyyyMMddHHmmss"), code, rand.Next(0, 9), ext);
                fi = new System.IO.FileInfo(FolderPath + "/" + name);

                if (!fi.Exists)
                {
                    break;
                }

                System.Threading.Thread.CurrentThread.Join(1000);
            }

            return name;
        }

        public Folder GetFolder(Project project, bool saveChanges)
        {
            DateTime date = DateTime.Now;
            int userID = db.CurrentUser.ID;

            Folder folder = db.Folders.FirstOrDefault(val => val.ProjectID == project.ID && !val.ParentID.HasValue);
            if (folder == null)
            {
                var args = new EntityJs.Client.Events.EntityEventArgs(db, "Folders", "Folder", folder, EntityJs.Client.Events.ActionsEnum.Insert);
                folder = new Folder() { ProjectID = project.ID, Project = project, Name = project.Name, ChangeDate = date, ChangerID = userID, CreateDate = date, CreatorID = userID };
                db.Folders.AddObject(folder);
                folder.OnInserted(args);
                if (saveChanges)
                    db.SaveChanges();
            }

            return folder;
        }

        public Folder GetFolder(Project project, string taskName, bool saveChanges)
        {
            Folder projectFolder = GetFolder(project, false);
            
            DateTime date = DateTime.Now;
            int userID = db.CurrentUser.ID;
            string rname = taskName.Replace(System.IO.Path.GetInvalidFileNameChars(), "_");

            Folder folder = db.Folders.FirstOrDefault(val => val.ProjectID == project.ID && val.ParentID == projectFolder.ID && (val.Name == taskName || val.Name == rname));
            if (folder == null)
            {
                var args = new EntityJs.Client.Events.EntityEventArgs(db, "Folders", "Folder", folder, EntityJs.Client.Events.ActionsEnum.Insert);
                folder = new Folder() { ProjectID = project.ID, Project = project, Name = taskName, ChangeDate = date, ChangerID = userID, CreateDate = date, CreatorID = userID, ParentFolder = projectFolder };
                db.Folders.AddObject(folder);
                folder.OnInserted(args);
                if (saveChanges)
                    db.SaveChanges();
            }

            return folder;
        }
    }
}