using AdCrm.Helpers;
using AdCrm.Models;
using EntityJs.Client;
using EntityJs.Client.Events;
using EntityJs.Client.Objects;
using System;
using System.Collections.Generic;
using System.Data.Objects;
using System.Data.Objects.DataClasses;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Caching;
using System.Web.Mvc;
using System.Web.Script.Serialization;

namespace AdCrm.Controllers
{
    [CompressFilter]
    public class DataController : DataControllerBase
    {
        public const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        public const int MaxFileSize = 52428800; //50MB
        public string UploadedFilesFolder
        {
            get
            {
                //Company c = HttpContext.CurrentCompany();
                return "UploadedFiles";// +(c != null ? "/" + c.ID : "");
            }
        }
        JavaScriptSerializer serializer = new JavaScriptSerializer();

        public DataController()
            : base(new AdCrm.Models.BuildingEntities())
        {
        }

        protected override EntityModel<System.Data.Objects.ObjectContext> CreateModel()
        {
            return new Models.JsModel(this.db);
        }

        public override ActionResult Select(JsSelectOptions Options)
        {
            ActionResult result = base.Select(Options);
            db.SaveChanges();
            return result;
        }

        public JsonResult Export(JsExportOptions Options)
        {
            byte[] content = null;
            int startRow = 1, startColumn = 1;
            JsonResult result = new JsonResult() { JsonRequestBehavior = JsonRequestBehavior.AllowGet };
            string id = Guid.NewGuid().ToString();
            JsSelectOptions so = Options.SelectOptions;
            if (Options.Type == ExportTypesEnum.AllRows)
            {
                so.Skip = -1;
                so.Take = -1;
            }

            Selecter<ObjectContext> selecter = new Selecter<ObjectContext>(model);
            JsSelectResult selectResult = selecter.Select(so);
            IEnumerable<EntityObject> data = selectResult.Collections[so.EntitySetName];
            string fileName = Options.Name.StringAndTrim();
            fileName += !fileName.EndsWith(".xlsx") ? ".xlsx" : "";
            fileName = fileName.Replace(System.IO.Path.GetInvalidFileNameChars(), "");

            OfficeOpenXml.ExcelPackage p = new OfficeOpenXml.ExcelPackage();
            OfficeOpenXml.ExcelWorkbook book = p.Workbook;
            OfficeOpenXml.ExcelWorksheet sheet;
            Type itType;
            EntityObject first;
            try
            {
                first = data.FirstOrDefault();
                itType = first != null ? first.GetType() : null;

                sheet = book.Worksheets.Add(Options.Name);

                int i = 0;
                foreach (JsExportParameter ep in Options.Parameters)
                {
                    ep.Compile(itType);
                    sheet.Cells[startRow, startColumn + i].Value = ep.Name;
                    sheet.Column(startColumn + i).AutoFit();
                    sheet.Column(startColumn + i).BestFit = true;
                    i++;
                }

                if (!data.Any())
                {
                    sheet.Row(startRow).Style.Border.Bottom.Style = OfficeOpenXml.Style.ExcelBorderStyle.Thin;
                    sheet.Row(startRow).Style.Font.Bold = true;

                    using (MemoryStream ms = new MemoryStream())
                    {
                        p.SaveAs(ms);
                        content = ms.ToArray();
                        result.Data = new { Success = true, Result = data.Count(), ID = id };
                        HttpContext.Cache[id] = File(content, XlsxContentType, fileName);
                        return result;
                    }
                }

                i = startRow + 1;
                foreach (EntityObject item in data)
                {
                    for (int j = 0; j < Options.Parameters.Length; j++)
                    {
                        JsExportParameter par = Options.Parameters[j];
                        object value = par.GetValue(item);

                        if (value != null && value.GetType() == typeof(DateTime))
                        {
                            value = ((DateTime)value).ToShortDateString();
                        }

                        sheet.Cells[i, startColumn + j].Value = value;
                    }
                    i++;
                }

                sheet.Row(startRow).Style.Border.Bottom.Style = OfficeOpenXml.Style.ExcelBorderStyle.Thin;
                sheet.Row(startRow).Style.Font.Bold = true;

                for (i = 0; i < sheet.Dimension.End.Column; i++)
                {
                    sheet.Column(startColumn + i).AutoFit();
                    sheet.Column(startColumn + i).BestFit = true;
                }

                using (MemoryStream ms = new MemoryStream())
                {
                    p.SaveAs(ms);
                    content = ms.ToArray();
                    result.Data = new { Success = true, Result = new { Count = data.Count(), ID = id }, Code = 200 };
                    HttpContext.Cache[id] = File(content, XlsxContentType, fileName);
                }
            }
            catch (Exception ex)
            {
                result.Data = new { Success = false, Error = ex.Message };
            }
            finally
            {
                p.Dispose();
            }

            return result;
        }

        public override ActionResult DownloadFile(string ID, int FileID = -1)
        {
            string[] asImage = new[] { "jpg", "png", "jpeg", "bmp", "gif", "tiff" };
            if (ID.IsNotNullOrEmpty() && HttpContext.Cache[ID] as FileResult != null)
            {
                FileResult f = HttpContext.Cache[ID] as FileResult;
                return f;
            }

            BuildingEntities db = this.db as BuildingEntities;
            Models.File file = db.Files.FirstOrDefault(val => val.ID == FileID);

            if (file.Name != ID)
            {
                return new EmptyResult();
            }

            bool asContent = false;
            string ext = Path.GetExtension(file.Url).Replace(".", string.Empty);
            if (asImage.Contains(ext))
            {
                asContent = true;
                Response.ContentType = "image/" + ext;
            }
            else if (ext == "txt")
            {
                asContent = true;
                Response.ContentType = System.Net.Mime.MediaTypeNames.Text.Plain;
            }
            else if (ext == "pdf")
            {
                asContent = true;
                Response.ContentType = System.Net.Mime.MediaTypeNames.Application.Pdf;
            }
            else if (ext == "mp3")
            {
                asContent = true;
                Response.ContentType = "audio/mpeg";
            }

            if (asContent)
            {
                Response.WriteFile(file.RealPath);
                Response.End();
                return new EmptyResult();
            }

            return File(file.RealPath, "application/" + ext, ID);
        }

        //public override ActionResult UploadFile(string ID, int FileID = -1)
        //{
        //    ViewBag.ID = ID;
        //    ViewBag.FileID = FileID;

        //    if (Request.Files.Count < 1)
        //    {
        //        return View();
        //    }

        //    BuildingEntities db = this.db as BuildingEntities;
        //    HttpPostedFileBase item = Request.Files[0];
        //    Models.File file = null;
        //    string folder, upfolder = UploadedFilesFolder;
        //    string ext = System.IO.Path.GetExtension(item.FileName).Replace(".", string.Empty);
        //    Company c = db.CurrentCompany;
        //    upfolder += (c != null ? "/" + c.ID : "");

        //    //FileType ft = db.FileTypes.FirstOrDefault(val => val.Allow && val.Extension.Contains(ext));
        //    DirectoryInfo di;

        //    //if (ft == null)
        //    //{
        //    //    ViewBag.Data = serializer.Serialize(new { Code = 202, Message = "Incorrect extension", ID = ID });
        //    //    return View();
        //    //}

        //    if (MaxFileSize < item.ContentLength)// ft.MaxSize > 0 && ft.MaxSize * 1000 < item.ContentLength)
        //    {
        //        ViewBag.Data = serializer.Serialize(new { Code = 202, Message = "Incorrect size", ID = ID });
        //        return View();
        //    }

        //    if (FileID > 0)
        //    {
        //        file = db.Files.FirstOrDefault(val => val.ID == FileID);
        //    }

        //    if (file == null)
        //    {
        //        file = new Models.File();
        //        db.Files.AddObject(file);
        //    }
        //    else
        //    {
        //        file.RemoveFile();
        //    }

        //    folder = Path.Combine(HttpRuntime.AppDomainAppPath, upfolder);
        //    di = new DirectoryInfo(folder);

        //    if (!di.Exists)
        //    {
        //        di.Create();
        //    }

        //    file.Name = item.FileName;
        //    file.Url = string.Format("{0}/{1}", upfolder, this.GetNextFileName(item.FileName, folder));
        //    //file.TypeID = ft.ID;
        //    file.CreateDate = file.ChangeDate = DateTime.Now;
        //    file.CreatorID = file.ChangerID = HttpContext.CurrentUser().ID;

        //    item.SaveAs(file.RealPath);

        //    db.SaveChanges();

        //    ViewBag.Data = serializer.Serialize(new { Code = 200, Message = string.Empty, File = file.ToJson(), ID = ID });

        //    return View();
        //}

        public override ActionResult UploadFile(string ID, int FileID = -1)
        {
            return UploadToFolder(ID, null, -1);
        }

        public ActionResult UploadToFolder(string ID, int? FolderID, int FileID = -1)
        {
            ViewBag.ID = ID;
            ViewBag.FileID = FileID;
            User user = HttpContext.CurrentUser();

            if (Request.Files.Count < 1)
            {
                return View();
            }

            bool watermark = ID.ToLower() != "photoid";
            int code;
            string message;
            UploadFileHelper helper = new UploadFileHelper(this.db as BuildingEntities);
            Models.File file = helper.UploadFiles(FileID, FolderID, out code, out message, watermark);

            var data = new { Code = code, Message = message, File = file != null ? file.ToJson() : null, ID = ID };

            if (ID.IsNotNullOrEmpty() && ID.ToLower().Trim().StartsWith("json"))
            {
                return this.Json(data);
            }

            ViewBag.Data = serializer.Serialize(data);
            //ViewBag.Data = Newtonsoft.Json.JsonConvert.SerializeObject(data, new Newtonsoft.Json.JsonSerializerSettings() { DateFormatHandling = Newtonsoft.Json.DateFormatHandling.MicrosoftDateFormat });

            return View();
        }

        public ActionResult UploadToTask(int ProjectID, int? TaskID, string TaskName)
        {
            BuildingEntities db = (BuildingEntities)this.db;
            User user = HttpContext.CurrentUser();

            if (Request.Files.Count < 1)
            {
                return Json(new { Code = 202, Success = false, Message = "No files uploaded!" });
            }

            Project project = db.Projects.FirstOrDefault(val => val.ID == ProjectID);
            if (project == null)
            {
                return Json(new { Code = 202, Success = false, Message = "Project not found!" });
            }

            CheckPermissionsEventArgs e = new CheckPermissionsEventArgs(db, "Projects", "Project", project, EntityJs.Client.Events.ActionsEnum.Select);
            project.OnCheckPermissions(e);
            if (e.Cancel)
            {
                return Json(new { Code = 202, Success = false, Message = "You can't operate with this project!" });
            }

            ProjectTask task = null;
            if (TaskID > 0)
            {
                task = db.ProjectTasks.FirstOrDefault(val => val.ID == TaskID);
                if (task == null)
                    return Json(new { Code = 202, Success = false, Message = "Task not found!" });

                e = new CheckPermissionsEventArgs(db, "ProjectTasks", "ProjectTask", task, EntityJs.Client.Events.ActionsEnum.Edit);
                task.OnCheckPermissions(e);
                if (e.Cancel)
                {
                    return Json(new { Code = 202, Success = false, Message = "You can't edit this task!" });
                }
            }

            int code;
            string message;
            UploadFileHelper helper = new UploadFileHelper(this.db as BuildingEntities);

            Folder folder = helper.GetFolder(project, TaskName, true);

            Models.File file = helper.UploadFiles(-1, folder.ID, out code, out message, false);
            Models.ProjectFile pfile = file != null ? file.ProjectFiles.FirstOrDefault(val => val.ProjectID == ProjectID) : null;
            if (pfile != null)
            {
                pfile.ProjectTask = task;
                db.SaveChanges();
            }
            var data = new { Code = code, Message = message, File = file != null ? file.ToJson() : null, ProjectFile = pfile != null ? pfile.ToJson() : null };

            return this.Json(data);
        }

        [HttpPost]
        public ActionResult ToExcel(string Name, string[] Headers, List<string[]> Rows, MetaElement[] Meta)
        {
            //TODO: this method should be refactored
            int headerRow = 1;
            int bodyRow = 2;
            int column = 1;
            string sheetName = "Лист1";
            byte[] result = null;
            string key = string.Empty;
            Name = Name ?? "";

            if (Name == "" || Rows == null)
            {
                return Json(new { Success = false });
            }

            Name = Name.EndsWith(".xlsx") ? Name : Name + ".xlsx";

            using (OfficeOpenXml.ExcelPackage excel = new OfficeOpenXml.ExcelPackage())
            {
                if (!excel.Workbook.Worksheets.Any())
                {
                    excel.Workbook.Worksheets.Add(sheetName);
                }
                OfficeOpenXml.ExcelWorksheet sheet = excel.Workbook.Worksheets.First();
                int i = column;
                int j = column;
                if (Headers != null)
                {
                    foreach (string header in Headers)
                    {
                        sheet.Cells[headerRow, i].Value = header;
                        sheet.Cells[headerRow, i].Style.Font.Bold = true;
                        sheet.Cells[headerRow, i].Style.Border.Bottom.Style = OfficeOpenXml.Style.ExcelBorderStyle.Thin;
                        i++;
                    }
                }
                else
                {
                    bodyRow = 1;
                }

                i = bodyRow;
                foreach (string[] values in Rows)
                {
                    foreach (string value in values)
                    {
                        sheet.Cells[i, j].Value = value;
                        j++;
                    }
                    j = column;
                    i++;
                }

                if (Meta != null)
                {
                    for (i = 0; i < Meta.Length; i++)
                    {
                        MetaElement meta = Meta[i];
                        for (j = 0; j < meta.Settings.Count; j += 2)
                        {
                            string par = meta.Settings[j];
                            string value = meta.Settings[j + 1];

                            if (par.ToLower() == "fontweight")
                            {
                                switch (meta.Name.ToLower())
                                {
                                    case "row": sheet.Row(meta.ID.ToInt()).Style.Font.Bold = value.ToLower() == "bold"; break;
                                    case "sheet":
                                        var s = excel.Workbook.Worksheets[meta.ID.ToInt()];
                                        var dim = s.Dimension;
                                        s.Cells[dim.Start.Row, dim.Start.Column, dim.End.Row, dim.End.Column].Style.Font.Bold = value.ToLower() == "bold"; break;
                                }
                            }
                            else if (par.ToLower() == "fontfamily")
                            {
                                switch (meta.Name.ToLower())
                                {
                                    case "row": sheet.Row(meta.ID.ToInt()).Style.Font.Name = value; break;
                                    case "sheet":
                                        var s = excel.Workbook.Worksheets[meta.ID.ToInt()];
                                        var dim = s.Dimension;
                                        s.Cells[dim.Start.Row, dim.Start.Column, dim.End.Row, dim.End.Column].Style.Font.Name = value; break;
                                }
                            }
                            else if (par.ToLower() == "merge")
                            {
                                switch (meta.Name.ToLower())
                                {
                                    case "range":
                                        string[] v = meta.ID.Split(",");
                                        sheet.Cells[v[0].ToInt(), v[1].ToInt(), v[2].ToInt(), v[3].ToInt()].Merge = value.ToBool(); break;
                                }
                            }
                        }

                    }
                }

                for (i = column; i <= sheet.Dimension.End.Column; i++)
                {
                    sheet.Column(i).BestFit = true;
                    sheet.Column(i).AutoFit();
                }

                using (MemoryStream ms = new MemoryStream())
                {
                    excel.SaveAs(ms);
                    result = ms.ToArray();
                }
            }
            key = Guid.NewGuid().ToString();

            Session[key] = new object[] { Name, result };

            return Json(new { Success = true, Url = Url.Action("GetExcel", new { Key = key }) });
        }

        public ActionResult GetExcel(string Key)
        {
            object[] fileInfo = (object[])Session[Key];
            Session[Key] = null;
            return File((byte[])fileInfo[1], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", (string)fileInfo[0]);
        }

        [Authorize(Roles = "admin,boss")]
        public ActionResult FilesBackup()
        {
            //string upfolder = UploadedFilesFolder;
            //string genfolder = "GeneratedFiles";
            BuildingEntities db = (BuildingEntities)this.db;
            string fileName = "FilesBackup_" + DateTime.Now.ToString("yyyyMMdd") + ".zip";
            FileContentResult result;

            List<AdCrm.Models.File> projectFiles = db.ProjectFiles.Where(val => !val.Project.Deleted).Select(val => val.File).ToList();
            List<AdCrm.Models.File> contractorFiles = db.ContractorFiles.Where(val => !val.Contractor.Deleted).Select(val => val.File).ToList();

            //upfolder = Path.Combine(HttpRuntime.AppDomainAppPath, upfolder);
            //genfolder = Path.Combine(HttpRuntime.AppDomainAppPath, genfolder);

            Ionic.Zip.ZipFile zip = new Ionic.Zip.ZipFile(fileName);
            MemoryStream ms = new MemoryStream();

            foreach (var f in projectFiles)
            {
                if (System.IO.File.Exists(f.RealPath))
                {
                    string folder = Path.GetDirectoryName(f.Url);
                    zip.AddFile(f.RealPath, folder);
                }
            }
            foreach (var f in contractorFiles)
            {
                if (System.IO.File.Exists(f.RealPath))
                {
                    string folder = Path.GetDirectoryName(f.Url);
                    zip.AddFile(f.RealPath, folder);
                }
            }

            zip.Save(ms);
            result = File(ms.ToArray(), System.Net.Mime.MediaTypeNames.Application.Zip, fileName);

            zip.Dispose();
            ms.Dispose();

            return result;
        }

        public ActionResult DownloadFolder(string ID, int FolderID)
        {
            BuildingEntities db = (BuildingEntities)this.db;
            string fileName = ID + ".zip";
            FileContentResult result;

            Folder folder = db.Folders.FirstOrDefault(val => val.ID == FolderID && val.Name == ID);
            if (folder == null)
                return HttpNotFound();

            //List<Folder> folders = db.Folders.Where(val => val.ProjectID == folder.ProjectID && val.Level > folder.Level && val.TreeString.StartsWith(folder.TreeString)).ToList();
            List<Models.File> files = db.Files.Include("Folder").Where(val => val.Folder.ProjectID == folder.ProjectID && val.Folder.TreeString.StartsWith(folder.TreeString)).ToList();

            Ionic.Zip.ZipFile zip = new Ionic.Zip.ZipFile(fileName);
            MemoryStream ms = new MemoryStream();

            foreach (Models.File f in files)
            {
                if (System.IO.File.Exists(f.RealPath))
                {
                    string path = f.Folder == folder ? "" : f.Folder.FullName.Substring(folder.FullName.Length + 1);
                    var zfile = zip.AddFile(f.RealPath, path);

                    if (zfile.FileName.Contains('/'))
                        zfile.FileName = zfile.FileName.Substring(0, zfile.FileName.LastIndexOf('/') + 1) + f.Name;
                    else
                        zfile.FileName = f.Name;
                }
            }

            zip.Save(ms);
            result = File(ms.ToArray(), System.Net.Mime.MediaTypeNames.Application.Zip, fileName);

            zip.Dispose();
            ms.Dispose();

            return result;
        }

        public class MetaElement
        {
            public string ID { get; set; }
            public string Name { get; set; }

            public List<string> Settings { get; set; }
        }

        public override JsonResult SaveUserSettings(string Name, string Value)
        {
            BuildingEntities db = this.db as BuildingEntities;
            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            Models.UserSetting setting = db.UserSettings.FirstOrDefault(val => val.Name == Name && val.UserID == userID);

            if (setting == null)
            {
                setting = new UserSetting();
                setting.Name = Name;
                setting.UserID = userID;
                db.UserSettings.AddObject(setting);
            }

            setting.Value = Value;
            db.SaveChanges();

            return Json(setting.ToJson());
        }

        public override void ImageThumbnail(string ID, int FileID, int Width = 100)
        {
            string ImageThumbCacheKey = "ImageThumbCacheKey";
            int cacheDurationMins = 30;
            string[] imgExtensions = new[] { ".jpg", ".png", ".bmp", ".jpeg" };
            string[] docExtensions = new[] { ".doc", ".docx", ".odt" };
            string[] xlsExtensions = new[] { ".xls", ".xlsx", ".ods" };
            System.Drawing.Imaging.EncoderParameters encoderParams = new System.Drawing.Imaging.EncoderParameters();
            System.Drawing.Imaging.EncoderParameter encoderParam = new System.Drawing.Imaging.EncoderParameter(System.Drawing.Imaging.Encoder.Quality, (long)120);
            encoderParams.Param = new System.Drawing.Imaging.EncoderParameter[] { encoderParam };

            string imgKey = string.Format(ImageThumbCacheKey, ID, Width);
            string pathKey = string.Format(ImageThumbCacheKey, ID, Width);
            byte[] imageBytes = null;
            string mappedPath = HttpContext.Cache[pathKey] as string;
            BuildingEntities db = this.db as BuildingEntities;

            Models.File image = db.Files.FirstOrDefault(val => val.ID == FileID && val.Name == ID);
            string realPath, virtualPath;

            System.Drawing.Bitmap bmp, thumb;
            MemoryStream ms;

            if (image == null)
            {
                return;
            }

            realPath = image.RealPath;
            virtualPath = image.VirtualPath;

            FileInfo fi = new FileInfo(realPath);

            if (!fi.Exists)
            {
                return;
            }

            if (docExtensions.Contains(fi.Extension))
            {
                realPath = Path.Combine(HttpRuntime.AppDomainAppPath, "Content/Images/Icons/Big/document.png");
            }
            else if (xlsExtensions.Contains(fi.Extension))
            {
                realPath = Path.Combine(HttpRuntime.AppDomainAppPath, "Content/Images/Icons/Big/excel_document.png");
            }
            else if (fi.Extension == ".pdf")
            {
                realPath = Path.Combine(HttpRuntime.AppDomainAppPath, "Content/Images/Icons/Big/pdf_document.png");
            }
            else if (!imgExtensions.Contains(fi.Extension))
            {
                realPath = Path.Combine(HttpRuntime.AppDomainAppPath, "Content/Images/Icons/Big/photo_album.png");
            }

            bmp = new System.Drawing.Bitmap(realPath);
            thumb = global::Helpers.ImageHelper.CreateThumbnailImage(bmp, Width);
            bmp.Dispose();

            ms = new MemoryStream();
            thumb.Save(ms, global::Helpers.ImageHelper.GetImageEncoder(realPath), encoderParams);
            bmp.Dispose();
            thumb.Dispose();
            ms.Flush();

            mappedPath = HttpContext.Server.MapPath("~/" + virtualPath);
            imageBytes = ms.ToArray();
            ms.Dispose();

            HttpContext.Cache.Insert(imgKey, imageBytes, null, Cache.NoAbsoluteExpiration, TimeSpan.FromMinutes(cacheDurationMins));
            HttpContext.Cache.Insert(pathKey, mappedPath, null, Cache.NoAbsoluteExpiration, TimeSpan.FromMinutes(cacheDurationMins));

            ReturnImage(mappedPath, imageBytes);
        }

        protected void ReturnImage(string mappedPath, byte[] imageBytes)
        {
            string type = global::Helpers.ImageHelper.GetContentType(mappedPath);

            Response.AddFileDependency(mappedPath);
            Response.ContentType = type;

            Response.Cache.SetCacheability(HttpCacheability.Public);
            Response.Cache.SetExpires(Cache.NoAbsoluteExpiration);
            Response.Cache.SetLastModifiedFromFileDependencies();
            Response.AppendHeader("Content-Length", imageBytes.Length.ToString());
            Response.OutputStream.Write(imageBytes, 0, imageBytes.Length);
            Response.Flush();
        }
    }
}
