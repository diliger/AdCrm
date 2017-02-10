using AdCrm.Helpers;
using AdCrm.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using System.Web.Script.Serialization;

namespace AdCrm.Controllers
{
    [CompressFilter]
    [Authorize(Roles = "admin,boss,manager,watcher")]
    public class ProjectController : Controller
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        BuildingEntities db = new BuildingEntities();
        //
        // GET: /Project/

        public ActionResult Index(int ID)
        {
            string settingsName = "/Project/Index";

            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            Project project = db.Projects.FirstOrDefault(val => val.ID == ID && !val.Deleted);
            if (!Available(project))
            {
                ViewBag.Error = "Forbidden";
                return View("Error");
            }

            List<ContactPerson> contactPersons;// = project.Contractor != null ? project.Contractor.ContactPersons.Where(val => !val.Deleted && !val.Archived).ToList() : new List<ContactPerson>();
            List<Contractor> contractors = new List<Contractor>();
            List<Contract> contracts = new List<Contract>();
            List<User> users = new List<User>();
            if (project.Contractor != null)
            {
                contractors.Add(project.Contractor);
                contracts.AddRange(db.Contracts.Where(val => val.ContractorID == project.ContractorID && val.RoleID == (int)BuildingEntities.ContractRolesEnum.WithCustomerFrame));
            }
            if (project.Subcontractor != null)
            {
                contractors.Add(project.Subcontractor);
            }
            contractors.AddRange(project.ProjectWorks.Where(val => val.ContractorID.HasValue).Select(val => val.Contractor).Distinct());
            contractors.AddRange(project.Payments.Where(val => val.ContractorID.HasValue).Select(val => val.Contractor).Distinct());
            contractors = contractors.Distinct().ToList();

            contactPersons = contractors.SelectMany(val => val.ContactPersons.Where(val2 => !val2.Deleted && !val2.Archived)).ToList();
            contracts.AddRange(project.Contracts.ToList());

            users = db.Users.Where(val => !val.Deleted && !val.Blocked && val.RoleID > (int)RolesEnum.Admin && val.RoleID < (int)RolesEnum.Employee || val.ID == project.ResponsibleID).ToList();
            object data = new
            {
                Projects = new[] { project.ToJson("Details") },
                ProjectProperties = project.GetJsonProperties("Details"),
                Users = users.Select(val => val.ToJson()).ToList(),
                Contracts = contracts.Select(val => val.ToJson()).ToList(),
                Contractors = contractors.Select(val => val.ToJson()).ToList(),
                ContactPersons = contactPersons.Select(val => val.ToJson()).ToList(),
                DaysFromTypes = db.DaysFromTypes.ToList().Select(val => val.ToJson()).ToList(),
                ProjectWorks = project.ProjectWorks.ToList().Select(val => val.ToJson()).ToList(),
                ProjectFiles = project.ProjectFiles.ToList().Select(val => val.ToJson()).ToList(),
                ProjectStages = project.ProjectStages.ToList().Select(val => val.ToJson()).ToList(),
                Contacts = contactPersons.SelectMany(val => val.Contacts).ToList().Select(val => val.ToJson()).ToList(),
                ContactTypes = db.ContactTypes.ToList().Select(val => val.ToJson()).ToList(),
                ProjectStatuses = db.ProjectStatuses.ToList().Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.StartsWith(settingsName)).ToList().Select(val => val.ToJson()).ToList(),
                ProjectFileCategories = db.ProjectFileCategories.Where(val => !val.Deleted).OrderBy(val => val.OrderNumber).ThenBy(val => val.ID).ToList().Select(val => val.ToJson()).ToList(),
                //WorkStages = db.WorkStages.Where(val => (!val.Deleted || val.ProjectStages.Any(ps => ps.ProjectID == ID))).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList(),
                //Refbooks = db.Refbooks.Where(val => val.TypeID == (int)RefbookTypesEnum.StageCategories && (!val.Deleted || val.WorkStages.Any(w => !w.Deleted))).ToList().Select(val => val.ToJson()).ToList(),
                ProjectTypes = db.ProjectTypes.ToList().Select(val => val.ToJson()).ToList(),
                Children = project.ChildProjects.Select(val => val.ToJson()),
                ProjectNotes = db.ProjectNotes.Where(val => val.ProjectID == ID).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Project = project;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Project.Index";
            return View();
        }

        public ActionResult Tasks(int ID)
        {
            string settingsName = "/Project/Tasks";

            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            Project project = db.Projects.FirstOrDefault(val => val.ID == ID && !val.Deleted);
            if (!Available(project))
            {
                ViewBag.Error = "Forbidden";
                return View("Error");
            }

            List<User> users = db.Users.Where(val => !val.Deleted && !val.Blocked && val.RoleID > (int)RolesEnum.Admin && val.RoleID < (int)RolesEnum.Employee
                || val.ID == project.ResponsibleID || val.ProjectTasks.Any(t => t.ProjectID == ID || t.Project.ParentID == ID)).ToList();
            List<Project> projects = db.Projects.Where(val => !val.Deleted && (val.ID == ID || val.ParentID == ID)).ToList();
            object data = new
            {
                Projects = projects.Select(val => val.ToJson("Details")).ToList(),
                Users = users.Select(val => val.ToJson()).ToList(),
                ProjectProperties = project.GetJsonProperties("Details"),
                Statbooks = db.Statbooks.Where(val => val.TypeID == (int)StatbookTypesEnum.TaskStatuses).ToList().Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.StartsWith(settingsName)).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Project = project;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Project.Tasks";
            return View();
        }

        public ActionResult Files(int ID)
        {
            string settingsName = "Project.Files";

            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            Project project = db.Projects.FirstOrDefault(val => val.ID == ID && !val.Deleted);
            if (!Available(project))
            {
                ViewBag.Error = "Forbidden";
                return View("Error");
            }

            DateTime date = DateTime.Now;
            UploadFileHelper helper = new UploadFileHelper(db);
            Folder folder = helper.GetFolder(project, true);

            object data = new
            {
                Folder = folder.ToJson(),
                Projects = new[] { project }.Select(val => val.ToJson("Details")).ToList(),
                //Users = users.Select(val => val.ToJson()).ToList(),
                ProjectProperties = project.GetJsonProperties("Details"),
                //Statbooks = db.Statbooks.Where(val => val.TypeID == (int)StatbookTypesEnum.TaskStatuses).ToList().Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.StartsWith(settingsName)).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Project = project;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = settingsName;
            return View();
        }

        public ActionResult FilesJson(int ID, int FolderID, string Filter)
        {
            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            Project project = db.Projects.FirstOrDefault(val => val.ID == ID && !val.Deleted);
            if (!Available(project))
            {
                ViewBag.Error = "Forbidden";
                return View("Error");
            }

            List<Folder> folders = new List<Folder>();
            List<File> files = new List<File>();
            if (Filter.IsNullOrEmpty())
            {
                folders = db.Folders.Where(val => val.ProjectID == ID && val.ParentID == FolderID).ToList();
                files = db.Files.Where(val => val.FolderID == FolderID && val.Folder.ProjectID == ID).ToList();
            }
            else
            {
                Filter = Filter.StringAndTrim().ToLower();
                Folder parent = db.Folders.FirstOrDefault(val => val.ProjectID == ID && val.ID == FolderID);
                folders = db.Folders.Where(val => val.ProjectID == ID && val.TreeString.StartsWith(parent.TreeString) && val.Level > parent.Level && val.Name.Contains(Filter)).ToList();
                files = db.Files.Where(val => val.Folder.ProjectID == ID && val.Folder.TreeString.StartsWith(parent.TreeString) && val.Name.Contains(Filter)).ToList();
            }

            return Json(new { Success = true, Folders = folders.Select(val => val.ToJson()).ToList(), Files = files.Select(val => val.ToJson()).ToList() });
        }

        public ActionResult DownloadFiles(int ID, string Folders, string Files)
        {
            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            BuildingEntities db = (BuildingEntities)this.db;
            FileContentResult result;

            Project project = db.Projects.FirstOrDefault(val => val.ID == ID && !val.Deleted);
            if (!Available(project))
            {
                ViewBag.Error = "Forbidden";
                return View("Error");
            }

            int[] folderIDs = Folders.StringAndTrim().Split(',').Select(val => val.ToIntOrDefault()).Where(val => val.HasValue).Select(val => val.Value).ToArray();
            int[] filesIDs = Files.StringAndTrim().Split(',').Select(val => val.ToIntOrDefault()).Where(val => val.HasValue).Select(val => val.Value).ToArray();

            string fileName = project.Name.Replace(System.IO.Path.GetInvalidFileNameChars(), "_") + ".zip";
            Ionic.Zip.ZipFile zip = new Ionic.Zip.ZipFile(fileName);
            System.IO.MemoryStream ms = new System.IO.MemoryStream();

            if (Folders != null && Folders.Any())
            {
                List<Folder> folders = db.Folders.Where(val => val.ProjectID == ID && folderIDs.Contains(val.ID)).ToList();
                foreach (Folder folder in folders)
                {
                    List<Models.File> files = db.Files.Include("Folder").Where(val => val.Folder.ProjectID == folder.ProjectID && val.Folder.TreeString.StartsWith(folder.TreeString)).ToList();
                    foreach (Models.File f in files)
                    {
                        if (System.IO.File.Exists(f.RealPath))
                        {
                            string trim = folder.FullName.Contains('/') ? folder.FullName.Substring(0, folder.FullName.LastIndexOf('/') + 1) : string.Empty;
                            string path = trim.Length > 0 ? f.Folder.FullName.Substring(trim.Length) : f.Folder.FullName;
                            var zfile = zip.AddFile(f.RealPath, path);

                            if (zfile.FileName.Contains('/'))
                                zfile.FileName = zfile.FileName.Substring(0, zfile.FileName.LastIndexOf('/') + 1) + f.Name;
                            else
                                zfile.FileName = f.Name;
                        }
                    }
                }

            }
            if (Files != null && Files.Any())
            {
                List<Models.File> files = db.Files.Include("Folder").Where(val => val.Folder.ProjectID == ID && filesIDs.Contains(val.ID)).ToList();

                foreach (Models.File f in files)
                {
                    if (System.IO.File.Exists(f.RealPath))
                    {
                        string path = string.Empty;
                        var zfile = zip.AddFile(f.RealPath, path);

                        if (zfile.FileName.Contains('/'))
                            zfile.FileName = zfile.FileName.Substring(0, zfile.FileName.LastIndexOf('/') + 1) + f.Name;
                        else
                            zfile.FileName = f.Name;
                    }
                }
            }

            zip.Save(ms);
            result = File(ms.ToArray(), System.Net.Mime.MediaTypeNames.Application.Zip, fileName);

            zip.Dispose();
            ms.Dispose();

            return result;
        }

        public ActionResult Payrolls(int ID)
        {
            string settingsName = "/Project/Payrolls";

            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            Project project = db.Projects.FirstOrDefault(val => val.ID == ID && !val.Deleted);
            if (!Available(project))
            {
                ViewBag.Error = "Forbidden";
                return View("Error");
            }

            //List<User> users = db.Users.Where(val => !val.Deleted && !val.Blocked && val.RoleID > (int)RolesEnum.Admin && val.RoleID < (int)RolesEnum.Employee
            //    || val.ID == project.ResponsibleID || val.ProjectTasks.Any(t => t.ProjectID == ID || t.Project.ParentID == ID)).ToList();
            //List<Project> projects = db.Projects.Where(val => !val.Deleted && (val.ID == ID || val.ParentID == ID)).ToList();
            object data = new
            {
                Project = project.ToJson("Details"),
                //Users = users.Select(val => val.ToJson()).ToList(),
                ProjectProperties = project.GetJsonProperties("Details"),
                //Statbooks = db.Statbooks.Where(val => val.TypeID == (int)StatbookTypesEnum.TaskStatuses).ToList().Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.StartsWith(settingsName)).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Project = project;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Project.Payrolls";
            return View();
        }

        public ActionResult PaymentsDialog()
        {
            return View();
        }

        public ActionResult ContractDialog()
        {
            return View();
        }

        public ActionResult ContractActs()
        {
            return View();
        }

        public ActionResult ReportDialog()
        {
            return View();
        }

        public ActionResult GainDialog()
        {
            return View();
        }

        public ActionResult WorksDialog()
        {
            string settingsName = "/Project/WorksDialog";
            User user = HttpContext.CurrentUser();
            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == user.ID && val.Name.StartsWith(settingsName)).ToList().Select(val => val.ToJson()).ToList(),
            };

            ViewBag.Data = serializer.Serialize(data);
            return View();
        }

        [HttpPost]
        public ActionResult GainJson(int ID)
        {
            User user = HttpContext.CurrentUser();
            Project project = db.Projects.FirstOrDefault(val => val.ID == ID && !val.Deleted);
            if (!Available(project))
            {
                ViewBag.Error = "Forbidden";
                return View("Error");
            }

            object data = null;
            List<Payment> payments = project.Payments.ToList();
            List<Payment> incomePayments = payments.Where(val => val.RoleID == (int)BuildingEntities.PaymentRolesEnum.FromCustomer).ToList();
            List<Payment> outgoingPayments = payments.Where(val => val.RoleID == (int)BuildingEntities.PaymentRolesEnum.ToSubcontractor).ToList();

            decimal totalIncome = 0, totalExpenses = 0, gain = 0;
            List<DateTime> monthes = new List<DateTime>();
            DateTime startDate = project.StartDate;
            DateTime endDate = project.EndDate;

            DateTime tempDate = startDate;

            int count = (endDate.Year - startDate.Year) * 12 + endDate.Month - startDate.Month;

            while (monthes.Count <= count)
            {
                monthes.Add(new DateTime(tempDate.Year, tempDate.Month, 1));
                tempDate = tempDate.AddMonths(1);
            }
            var rows = new List<object>();

            for (int i = 0; i < monthes.Count; i++)
            {
                DateTime m = monthes[i];
                var incomeQuery = incomePayments.Where(val => val.Date.Year == m.Year && val.Date.Month == m.Month);
                var outgoingQuery = outgoingPayments.Where(val => val.Date.Year == m.Year && val.Date.Month == m.Month);
                decimal incomeSum = incomeQuery.Any() ? incomeQuery.Sum(val => val.Sum) : 0;
                decimal outgoingSum = outgoingQuery.Any() ? outgoingQuery.Sum(val => val.Sum) : 0;
                decimal expenses = GetProjectExpenses(project, m.Year, m.Month);
                totalIncome += incomeSum;
                totalExpenses += outgoingSum + expenses;
                if (incomeSum == 0 && outgoingSum == 0 && expenses == 0)
                {
                    continue;
                }

                var item = new
                {
                    Month = m.Month,
                    Year = m.Year,
                    Income = incomeSum,
                    Expense = expenses > 0 ? expenses : outgoingSum,
                    ExpenseType = expenses > 0 ? 1 : outgoingSum > 0 ? 2 : 0
                };
                rows.Add(item);

                if (item.ExpenseType == 1 && outgoingSum > 0)
                {
                    item = new
                    {
                        Month = m.Month,
                        Year = m.Year,
                        Income = 0M,
                        Expense = outgoingSum,
                        ExpenseType = 2
                    };
                    rows.Add(item);
                }
            }

            data = new
            {
                Project = project.ToJson(),
                Income = totalIncome,
                Expenses = totalExpenses,
                Gain = totalIncome - totalExpenses,
                Rows = rows
            };

            return Json(data);
        }

        private decimal GetProjectExpenses(Project project, int year, int month)
        {
            User user = HttpContext.CurrentUser();
            var q = project.Expenses.Where(val => val.Date.Year == year && val.Date.Month == month);
            decimal projectExpenses = q.Any() ? q.Sum(val => val.Sum) : 0;


            return projectExpenses;
        }

        private bool Available(Project project)
        {
            //user.RoleID == (int)RolesEnum.Manager && (project == null || project.ResponsibleID != userID))
            return project != null;
        }

        //private decimal GetProjectRatio(int year, int month, int project)
        //{
        //    User user = HttpContext.CurrentUser();
        //    decimal earnedProject = 0;
        //    decimal earnedTotal = 0;
        //    foreach (Employee e in db.Employees.Where(val => val.WorkLogs.Any(val2 => SqlFunctions.DatePart("YEAR", val2.Date) == year && SqlFunctions.DatePart("MONTH", val2.Date) == month)))
        //    {
        //        earnedProject += e.GetEarnedMoney(year, month, project);
        //        earnedTotal += e.GetEarnedMoney(year, month);
        //    }
        //    return earnedTotal == 0 ? 0 : earnedProject / earnedTotal;
        //}

        [Authorize(Roles = "admin,boss,manager")]
        public JsonResult Document(int ID, int TypeID, int[] WorkIDs)
        {
            string GeneratedFolder = "GeneratedFiles";

            User user = HttpContext.CurrentUser();
            ProjectFileType fileType = db.ProjectFileTypes.FirstOrDefault(val => val.ID == TypeID);
            Project project = db.Projects.FirstOrDefault(val => val.ID == ID);
            List<ProjectWork> allWorks = db.ProjectWorks.Where(val => val.ProjectID == ID).OrderBy(val => val.OrderNumber).ThenBy(val => val.ID).ToList();
            List<ProjectWork> works = WorkIDs != null ? allWorks.Where(val => val.ProjectID == ID && WorkIDs.Contains(val.ID)).OrderBy(val => val.OrderNumber).ThenBy(val => val.ID).ToList() : allWorks;
            ProjectFile result;
            //works[0].Cost
            if (fileType == null || project == null)
            {
                return Json(new { Success = false });
            }

            AdCrm.Models.DynamicDocuments.DataProvider dp = new AdCrm.Models.DynamicDocuments.DataProvider()
            {
                Data = works,
                Number = "0",
                User = db.CurrentUser,
                Project = project
            };

            if (!string.IsNullOrEmpty(fileType.Condition) && !DynamicDocumentGenerator.Helpers.Reflection.CheckStringCondition(dp, fileType.Condition, false))
            {
                return Json(new { Success = false, Error = fileType.ErrorMessage });
            }

            result = new ProjectFile()
            {
                TypeID = TypeID,
                CategoryID = (int)BuildingEntities.ProjectFileCategoriesEnum.Generated,
                ProjectID = ID,
                File = new File()
                {
                    ChangeDate = DateTime.Now,
                    ChangerID = user.ID,
                    CreateDate = DateTime.Now,
                    CreatorID = user.ID,
                    Name = string.Format(fileType.ResultNameTemplate, project.Contract != null ? project.Contract.Number : "", DateTime.Now).Replace(System.IO.Path.GetInvalidFileNameChars(), "_"),
                    Url = ""
                }

            };
            db.ProjectFiles.AddObject(result);
            db.SaveChanges();

            //dp.Number = report.ID.ToString();
            result.File.Url = string.Format("{0}/{1}", GeneratedFolder, result.File.ID + "_" + fileType.FileName);

            System.IO.FileInfo fi = new System.IO.FileInfo(result.File.RealPath);
            if (!fi.Directory.Exists)
            {
                System.IO.Directory.CreateDirectory(fi.DirectoryName);
            }

            DynamicDocumentGenerator.Generator g = new DynamicDocumentGenerator.Generator(fileType, dp);
            g.BeforeGetValueFromString += (s, e) =>
            {
                if (e.Variable.Name == "{NumberInEstimation}")
                {
                    ProjectWork pw = e.Context as ProjectWork;
                    if (pw != null)
                    {
                        e.Value = allWorks.IndexOf(pw) + 1;
                        e.Stop = true;
                    }
                }
            };
            g.Generate();
            System.IO.File.WriteAllBytes(result.File.RealPath, g.ResultContent);

            db.SaveChanges();

            return Json(new { Success = true, ProjectFile = result.ToJson() });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            db.Dispose();
        }

    }
}
