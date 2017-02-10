using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using AdCrm.Helpers;
using AdCrm.Models;
using System.Web.Script.Serialization;
using System.Data.Objects.SqlClient;

namespace AdCrm.Controllers
{
    [CompressFilter]
    [Authorize(Roles = "admin,boss,manager,watcher")]
    public class ManagerController : Controller
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        BuildingEntities db = new BuildingEntities();
        // GET: /Manager/

        public ActionResult Index()
        {
            string settingsName = "/Manager/Index";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                ProjectStatuses = db.ProjectStatuses.ToList().Select(val => val.ToJson()).ToList(),
                ProjectTypes = db.ProjectTypes.ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Manager.Index";
            return View();
        }

        public ActionResult Contractors(int? ID, int? StatusID)
        {
            int[] refbookIDs = new[] { (int)RefbookTypesEnum.ContactPersonTypes, (int)RefbookTypesEnum.ContractorNoteTypes };
            int[] statbookIDs = new[] { (int)StatbookTypesEnum.Genders };

            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            ID = ID ?? 1;
            string settingsName = "Manager.Contractors" + "." + ID;
            if (StatusID.HasValue)
            {
                settingsName += "." + StatusID;
            }
            List<User> users = db.Users.Where(val => !val.Deleted && !val.Blocked && val.RoleID > (int)RolesEnum.Admin && val.RoleID < (int)RolesEnum.Employee || val.ResponsibleContractors.Any(c => !c.Deleted)).ToList();
            object data = new
            {
                Users = users.Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                InformationSources = db.InformationSources.ToList().Select(val => val.ToJson()).ToList(),
                ContractorTypes = db.ContractorTypes.ToList().Select(val => val.ToJson()).ToList(),
                ContractorSubTypes = db.ContractorSubTypes.ToList().Select(val => val.ToJson()).ToList(),
                ContactTypes = db.ContactTypes.ToList().Select(val => val.ToJson()).ToList(),
                Refbooks = db.Refbooks.Where(val => refbookIDs.Contains(val.TypeID)).ToList().Select(val => val.ToJson()).ToList(),
                Statbooks = db.Statbooks.Where(val => statbookIDs.Contains(val.TypeID)).ToList().Select(val => val.ToJson()).ToList(),
                Departments = db.Departments.OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList(),
                ContractorStatuses = db.ContractorStatuses.Where(val => !val.RoleID.HasValue || val.RoleID == ID).ToList().Select(val => val.ToJson()).ToList(),
                StatusID = StatusID,
                RoleID = ID
            };

            ViewBag.RoleID = ID;
            ViewBag.StatusID = StatusID;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Manager.Contractors." + ID + (StatusID.HasValue ? "." + StatusID : "");
            return View();
        }

        public ActionResult Departments()
        {
            string settingsName = "/Manager/Departments";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                Users = db.Users.Where(val => (!val.Blocked && !val.Deleted) || val.DepartmentsManager.Any()).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Manager.Employees.Departments";
            return View();
        }

        public ActionResult Employees()
        {
            string settingsName = "/Manager/Employees";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                Departments = db.Departments.Where(val => !val.Deleted || val.Employees.Any(val2 => !val2.Deleted)).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList(),
                Positions = db.Positions.Where(val => !val.Deleted || val.Employees.Any(val2 => !val2.Deleted)).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Manager.Employees";
            return View();
        }

        public ActionResult Tasks()
        {
            string settingsName = "/Manager/Tasks";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            List<User> users = db.Users.Where(val => !val.Deleted && !val.Blocked && val.RoleID > (int)RolesEnum.Admin && val.RoleID <= (int)RolesEnum.Employee || val.ID == userID || val.ProjectTasks.Any()).ToList();

            object data = new
            {
                Users = users.Select(val => val.ToJson()).ToList(),
                TaskTypes = db.TaskTypes.ToList().Select(val => val.ToJson()).ToList(),
                Statbooks = db.Statbooks.Where(val => val.TypeID == (int)StatbookTypesEnum.TaskStatuses).ToList().Select(val => val.ToJson()).ToList(),
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Manager.Tasks";
            ViewBag.MainJs = false;
            return View();
        }

        [HttpPost]
        [Authorize(Roles = "admin,boss,manager")]
        public JsonResult PayManagerFee(int[] IDs)
        {
            DateTime date = DateTime.Now;
            int userID = db.CurrentUser.ID;
            ExpenseType type = db.ExpenseTypes.FirstOrDefault(val => val.ManagerFee);
            if (type == null)
            {
                return Json(new { Success = false, Error = "Необходимо настроить тип расхода для выдачи % менеджера" });
            }
            List<Project> projects = db.Projects.Where(val => IDs.Contains(val.ID)).ToList();
            foreach (Project p in projects)
            {
                var e = new EntityJs.Client.Events.CheckPermissionsEventArgs(db, "Projects", "Project", p, EntityJs.Client.Events.ActionsEnum.Select);
                p.OnCheckPermissions(e);
                decimal sum = Math.Round(p.ManagerFeeAmount - p.ManagerFeePaid, 2);
                if (e.Cancel || sum <= 0)
                {
                    continue;
                }
                Employee employee = p.UserResponsible.Employee;
                if (employee == null)
                    continue;
                Expense ex = new Expense()
                {
                    Date = date,
                    ChangeDate = date,
                    ChangerID = userID,
                    CreateDate = date,
                    CreatorID = userID,
                    EmployeeID = employee.ID,
                    ProjectID = p.ID,
                    Sum = sum,
                    PeriodSum = sum,
                    TypeID = type.ID,
                    WalletID = employee.WalletID.Value
                };
                db.Expenses.AddObject(ex);
            }
            db.SaveChanges();
            return Json(new { Success = true });
        }

        [HttpPost]
        [Authorize(Roles = "admin,boss,manager")]
        public JsonResult DuplicateProject(int[] IDs)
        {
            DateTime date = DateTime.Now;
            int userID = db.CurrentUser.ID;
            User user = db.CurrentUser;

            if (IDs == null || !IDs.Any())
            {
                return Json(new { Success = false, Error = "Необходимо указать проекты" });
            }
            
            List<Project> originProjects = db.Projects.Where(val => IDs.Contains(val.ID) && !val.ParentID.HasValue).ToList();
            List<Project> projects = new List<Project>();
            foreach (Project old in originProjects)
            {
               projects.Add(DuplicateProject(old));
            }
            db.SaveChanges();
            return Json(new { Success = true, Projects = projects.Select(val => val.ToJson()).ToList() });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            db.Dispose();
        }

        private Project DuplicateProject(Project Origin, Project Parent = null, Dictionary<ProjectTask, ProjectTask> TasksMap = null, int? Diff = null)
        {
            DateTime date = DateTime.Now;
            int userID = db.CurrentUser.ID;
            User user = db.CurrentUser;

            int diff = Diff ?? (date - Origin.StartDate).Days;
            Project project = Origin.Duplicate();
            project.Name = string.Format("Копия - {0}", project.Name);
            project.CreatorID = userID;
            project.ChangerID = userID;
            project.ParentProject = Parent;

            db.Projects.AddObject(project);

            EntityJs.Client.Events.EntityEventArgs args = new EntityJs.Client.Events.EntityEventArgs(db, "Projects", "Project", project, EntityJs.Client.Events.ActionsEnum.Insert);
            project.OnInserted(args);

            TasksMap = TasksMap ?? new Dictionary<ProjectTask, ProjectTask>();
            foreach (ProjectTask oldTask in Origin.ProjectTasks)
            {
                ProjectTask task = oldTask.Duplicate();
                task.Creator = user.Login;
                task.Project = project;
                //if (task.DateBegin.HasValue)
                //    task.DateBegin = task.DateBegin.Value.AddDays(diff);
                //if (task.DateEndPlan.HasValue)
                //    task.DateEndPlan = task.DateEndPlan.Value.AddDays(diff);
                db.ProjectTasks.AddObject(task);

                args = new EntityJs.Client.Events.EntityEventArgs(db, "ProjectTasks", "ProjectTask", task, EntityJs.Client.Events.ActionsEnum.Insert);
                task.OnInserted(args);

                if (!oldTask.PreviousID.HasValue)
                {
                    task.DateBegin = date;
                }
                if (task.Type != null && task.Type.Duration.HasValue && task.DateBegin.HasValue)
                {
                    task.DateEndPlan = task.DateBegin.Value.AddDays(task.Type.Duration.Value);
                }

                TasksMap[oldTask] = task;                
            }

            foreach (Project child in Origin.ChildProjects)
            {
                DuplicateProject(child, project, TasksMap, diff);
            }

            foreach (KeyValuePair<ProjectTask, ProjectTask> pair in TasksMap)
            {
                ProjectTask task;
                if (pair.Key.PreviousTask != null && pair.Value.PreviousTask == null && TasksMap.TryGetValue(pair.Key.PreviousTask, out task))
                {
                    pair.Value.PreviousTask = task;
                    task.NextTasks.Add(pair.Value);
                }
            }

            //if (Parent == null)
            //{
            //    foreach (ProjectTask task in TasksMap.Values)
            //    {
            //        if (task.PreviousID.HasValue)
            //            continue;
            //        task.UpdateNextTasks();
            //    }
            //}
            return project;
        }
    }
}
