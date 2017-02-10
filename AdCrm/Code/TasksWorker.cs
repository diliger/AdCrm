using System;
using System.Collections.Generic;
using System.Data.Objects.SqlClient;
using System.Linq;
using System.Web;
using AdCrm.Models;

namespace AdCrm.Code
{
    public class TasksWorker : IWorker
    {
        public int ErrorsCount { get; set; }

        string taskOverdueKey = "TaskOverdueEmailMessage";
        BuildingEntities db = new Models.BuildingEntities();
        public TasksWorker() { }
        public TasksWorker(BuildingEntities db)
        {
            this.db = db;
        }

        public void DoWork()
        {
            string creator = "system", creatorName = "Система";

            DateTime date = DateTime.Now.Date;
            //List<ProjectTask> tasksToActivate = db.ProjectTasks.Where(val => val.StatusID < TaskStatusesEnum.Active && val.DateBegin <= date && (!val.PreviousID.HasValue || val.PreviousTask.StatusID == TaskStatusesEnum.Completed)).ToList();
            //foreach (ProjectTask task in tasksToActivate)
            //{
            //    bool send = task.StatusID == TaskStatusesEnum.Created;
            //    task.StatusID = TaskStatusesEnum.Active;
            //    db.SaveChanges();
            //    if (send)
            //        task.SendStatusNotification();
            //}

            //List<ProjectTask> tasksToDeactivate = db.ProjectTasks.Where(val => val.StatusID == TaskStatusesEnum.Active && (val.DateBegin > date || val.PreviousID.HasValue && val.PreviousTask.StatusID != TaskStatusesEnum.Completed)).ToList();
            //foreach (ProjectTask task in tasksToDeactivate)
            //{
            //    task.StatusID = TaskStatusesEnum.Created;
            //    db.SaveChanges();
            //}

            List<ProjectTask> tasksOverdue = db.ProjectTasks.Where(val => val.StatusID == TaskStatusesEnum.ToDo && SqlFunctions.DateDiff("DAY", val.DateEndPlan, date) == 1 && !val.Project.Deleted
                && !val.Messages.Any(m => SqlFunctions.DateDiff("DAY", date, m.CreateDate) == 0 && m.SysText == taskOverdueKey)).ToList();
            foreach (ProjectTask task in tasksOverdue)
            {
                task.SendNotification("ProjectTask_Overdue");
                ProjectTaskMessage m = new ProjectTaskMessage()
                {
                    CreateDate = DateTime.Now,
                    Creator = creator,
                    CreatorName = creatorName,
                    SysText = taskOverdueKey,
                    TaskID = task.ID,
                    Text = Settings.GetValue(taskOverdueKey + "Text")
                };
                db.ProjectTaskMessages.AddObject(m);
                db.SaveChanges();
            }

            List<Employee> employees = db.Employees.Where(val => val.SalaryExpenses.Any(se => se.ChangeDate > date || se.CreateDate > date) || val.Payrolls.Any(se => se.ChangeDate > date || se.CreateDate > date)).ToList();
            foreach (Employee emp in employees)
            {
                emp.UpdateSalaryBalance();
            }
            db.SaveChanges();
        }
    }
}