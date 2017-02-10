using AdCrm.Controllers;
using AdCrm.Models;
using System.Linq;
using System.Web.Mvc;

namespace AdCrm.Areas.Client.Controllers
{
    public class TasksController : BaseController
    {
        public ActionResult Index(int? ProjectID, int? StatusID, string Type, bool Completed = false)
        {
            TaskType type = Type.IsNullOrEmpty() ? null : db.TaskTypes.FirstOrDefault(val => !val.Deleted && val.SysName == Type);
            string typeName = type != null ? type.SysName : "Task";
            string settingsName = "/Client/" + typeName + "s/Index";

            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            int[] statbooksIDs = new[] { StatbookTypesEnum.TaskStatuses, StatbookTypesEnum.TaskPriorities, StatbookTypesEnum.TaskTurns };

            var projectsQuery = db.Projects.Where(val => !val.Deleted && !val.Archived);
            if (user.RoleID == (int)RolesEnum.Client)
            {
                projectsQuery = projectsQuery.Where(val => val.ContractorID == user.ContractorID);
            }
            projectsQuery = projectsQuery.OrderByDescending(val => val.CreateDate);

            var projects = projectsQuery.Take(10).ToList();
            var project = ProjectID.HasValue ? projectsQuery.FirstOrDefault(val => val.ID == ProjectID) : null;
            var statbooks = db.Statbooks.Where(val => statbooksIDs.Contains(val.TypeID)).OrderBy(val => val.OrderNumber).ToList();
            var status = statbooks.FirstOrDefault(val => val.ID == StatusID);

            if (project != null && user.RoleID == (int)RolesEnum.Client && user.ContractorID != project.ContractorID)
                project = null;
            if (status == null)
                StatusID = null;

            object data = new
            {
                Completed = Completed,
                StatusID = StatusID,
                TaskType = type != null ? type.ToJson() : null,
                Project = project != null ? project.ToJson() : null,
                Projects = projects.Select(val => val.ToJson()).ToList(),
                TaskTypes = db.TaskTypes.ToList().Select(val => val.ToJson()).ToList(),
                Statbooks = statbooks.Select(val => val.ToJson()).ToList(),
                Page = settingsName,
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.TaskStatuses = statbooks.Where(val => val.TypeID == StatbookTypesEnum.TaskStatuses).ToList();
            ViewBag.Completed = Completed;
            ViewBag.Status = status;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.TaskType = type;
            ViewBag.Page = "Client." + typeName + "s.Index";
            ViewBag.Project = project;
            ViewBag.MainJs = false;

            return View();
        }

        public ActionResult Details(int? ID, int? ProjectID, int? EmployeeID, string Type)
        {
            TaskType type = Type.IsNullOrEmpty() ? null : db.TaskTypes.FirstOrDefault(val => !val.Deleted && val.SysName == Type);
            string typeName = type != null ? type.SysName : "Task";
            string settingsName = "/Client/" + typeName + "s/Details";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            int? prevTaskID = null, nextTaskID = null;
            bool client = user.RoleID == (int)RolesEnum.Client;
            int[] statbooksIDs = new[] { StatbookTypesEnum.TaskStatuses, StatbookTypesEnum.TaskPriorities, StatbookTypesEnum.TaskTurns, StatbookTypesEnum.TaskVisibilities };

            var projectsQuery = db.Projects.Where(val => !val.Deleted && !val.Archived);
            if (client)
            {
                projectsQuery = projectsQuery.Where(val => val.ContractorID == user.ContractorID);
            }
            projectsQuery = projectsQuery.OrderByDescending(val => val.CreateDate);

            var projects = projectsQuery.Take(10).ToList();
            var statbooks = db.Statbooks.Where(val => statbooksIDs.Contains(val.TypeID)).OrderBy(val => val.OrderNumber).ToList();
            ProjectTask task = null;
            Employee employee = EmployeeID.HasValue ? db.Employees.FirstOrDefault(val => val.ID == EmployeeID && !val.Deleted) : null;

            if (ID.HasValue)
            {
                task = db.ProjectTasks.FirstOrDefault(val => val.ID == ID && !val.Deleted);
                if (task == null)
                    return HttpNotFound("Task not found!");
                if (task.Project.Deleted || client && (task.Project.ContractorID != user.ContractorID || task.VisibilityID == TaskVisibilitiesEnum.Hidden))
                {
                    Response.Write("Forbidden! Task not available!");
                    Response.StatusCode = (int)System.Net.HttpStatusCode.Forbidden;
                    Response.End();
                    return new EmptyResult();
                }
                if (Type.IsNotNullOrEmpty() && task.Type != null && task.Type.SysName != Type)
                {
                    return Redirect(Url.Content("~/Client/Tasks/Details/" + task.ID));
                }

                if (!projects.Contains(task.Project))
                    projects.Add(task.Project);

                var q = db.ProjectTasks.Where(val => val.ProjectID == task.ProjectID && val.StatusID == task.StatusID && (!client || val.VisibilityID == TaskVisibilitiesEnum.Visible));
                if (type != null)
                {
                    q = q.Where(val => val.TypeID == type.ID);
                }
                prevTaskID = q.Where(val => val.ID < task.ID).OrderByDescending(val => val.ID).Select(val => val.ID).FirstOrDefault();
                nextTaskID = q.Where(val => val.ID > task.ID).OrderBy(val => val.ID).Select(val => val.ID).FirstOrDefault();
            }
            if (ProjectID.HasValue)
            {
                Project p = projectsQuery.FirstOrDefault(val => val.ID == ProjectID);
                if (p != null && !projects.Contains(p))
                    projects.Add(p);
            }

            var data = new
            {
                ProjectID = ProjectID,
                EmployeeID = EmployeeID,
                PrevTaskID = prevTaskID,
                NextTaskID = nextTaskID,
                Task = task != null ? task.ToJson() : null,
                TaskType = type != null ? type.ToJson() : null,
                Completed = task != null ? task.Completed : false,
                Project = task != null ? task.Project.ToJson() : null,
                Employee = employee != null ? employee.ToJson() : null,
                Projects = projects.Select(val => val.ToJson()).ToList(),
                TaskTypes = db.TaskTypes.ToList().Select(val => val.ToJson()).ToList(),
                Messages = task != null ? task.Messages.OrderByDescending(val => val.CreateDate).Select(val => val.ToJson()).ToList() : null,
                Files = task != null ? task.Files.Select(val => val.ToJson()).ToList() : null,
                Statbooks = statbooks.Select(val => val.ToJson()).ToList(),
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.TaskStatuses = statbooks.Where(val => val.TypeID == StatbookTypesEnum.TaskStatuses).ToList();
            ViewBag.Completed = data.Completed;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.TaskType = type;
            ViewBag.Task = task;

            ViewBag.PrevTaskID = prevTaskID;
            ViewBag.NextTaskID = nextTaskID;

            ViewBag.Page = "Client." + typeName + "s.Details";
            ViewBag.MainJs = false;

            return View();
        }
    }
}
