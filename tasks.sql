ALTER TABLE ProjectTasks ADD [Description] NVARCHAR(MAX) NULL
ALTER TABLE ProjectTasks ADD PriorityID INT NULL
ALTER TABLE ProjectTasks ADD TurnID INT NULL
GO

ALTER TABLE [dbo].[ProjectTasks]  WITH CHECK ADD  CONSTRAINT [FK_ProjectTasks_Statbooks_PriorityID] FOREIGN KEY([PriorityID])
REFERENCES [dbo].[Statbooks] ([ID])
GO

ALTER TABLE [dbo].[ProjectTasks] CHECK CONSTRAINT [FK_ProjectTasks_Statbooks_PriorityID]
GO

ALTER TABLE [dbo].[ProjectTasks]  WITH CHECK ADD  CONSTRAINT [FK_ProjectTasks_Statbooks_TurnID] FOREIGN KEY([TurnID])
REFERENCES [dbo].[Statbooks] ([ID])
GO

ALTER TABLE [dbo].[ProjectTasks] CHECK CONSTRAINT [FK_ProjectTasks_Statbooks_TurnID]
GO

INSERT INTO StatbookTypes (ID, Name, SysName) VALUES (5, N'TaskPriorities', N'TaskPriorities'), (6, N'TaskTurns', N'TaskTurns')
GO

INSERT INTO Statbooks (ID, Name, SysName, Deleted, NeedDescription, TypeID, OrderNumber) VALUES 
(501, N'Критично', N'Critical', 0, 0, 5, 0), 
(502, N'Срочно', N'Urgent', 0, 0, 5, 0), 
(503, N'Важно', N'Important', 0, 0, 5, 0), 
(504, N'Нормально', N'Normal', 0, 0, 5, 0), 
(505, N'Может подождать', N'Low', 0, 0, 5, 0)
GO

INSERT INTO Statbooks (ID, Name, SysName, Deleted, NeedDescription, TypeID, OrderNumber) VALUES 
(601, N'Исполнителя', N'Executor', 0, 0, 6, 0), 
(602, N'Заказчика', N'Customer', 0, 0, 6, 0), 
(603, N'Третьей стороны', N'ThirdParty', 0, 0, 6, 0)
GO

INSERT INTO Roles (Name, SysName, Deleted) VALUES (N'Заказчик', N'Client', 0)
GO

ALTER TABLE Users DROP CONSTRAINT FK_Users_Companies
GO

ALTER TABLE Users DROP COLUMN CompanyID
GO

ALTER TABLE Users DROP COLUMN ManagerFee
GO

ALTER TABLE Users ADD ContractorID INT NULL
GO

ALTER TABLE [dbo].[Users]  WITH CHECK ADD  CONSTRAINT [FK_Users_Contractors] FOREIGN KEY([ContractorID])
REFERENCES [dbo].[Contractors] ([ID])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[Users] CHECK CONSTRAINT [FK_Users_Contractors]
GO

ALTER TABLE ProjectFiles ALTER COLUMN CategoryID INT NULL
GO

ALTER TABLE ProjectFiles ADD ProjectTaskID INT NULL
GO

ALTER TABLE [dbo].[ProjectFiles]  WITH CHECK ADD  CONSTRAINT [FK_ProjectFiles_ProjectTasks] FOREIGN KEY([ProjectTaskID])
REFERENCES [dbo].[ProjectTasks] ([ID])
GO

ALTER TABLE [dbo].[ProjectFiles] CHECK CONSTRAINT [FK_ProjectFiles_ProjectTasks]
GO

ALTER TABLE ProjectFiles ADD ProjectTaskMessageID INT NULL
GO

ALTER TABLE [dbo].[ProjectFiles]  WITH CHECK ADD  CONSTRAINT [FK_ProjectFiles_ProjectTaskMessages] FOREIGN KEY([ProjectTaskMessageID])
REFERENCES [dbo].[ProjectTaskMessages] ([ID])
GO

ALTER TABLE [dbo].[ProjectFiles] CHECK CONSTRAINT [FK_ProjectFiles_ProjectTaskMessages]
GO

UPDATE Statbooks SET Name = N'Пока не делать', SysName = N'New' WHERE ID = 301
UPDATE Statbooks SET Name = N'Обсуждение', SysName = N'Discussion' WHERE ID = 302
UPDATE Statbooks SET Name = N'Можно делать', SysName = N'ToDo' WHERE ID = 303
UPDATE Statbooks SET Name = N'В процессе', SysName = N'InProgress' WHERE ID = 304
GO

INSERT INTO Statbooks (ID, Name, SysName, Deleted, NeedDescription, TypeID, OrderNumber) VALUES (305, N'Можно тестировать', N'ToTest', 0, 0, 3, 0)
INSERT INTO Statbooks (ID, Name, SysName, Deleted, NeedDescription, TypeID, OrderNumber) VALUES (306, N'Выполнено', N'Completed', 0, 0, 3, 0)
GO

ALTER TABLE ProjectTaskMessages ADD Notify NVARCHAR(250) NULL
GO

ALTER TABLE ContactPersons DROP CONSTRAINT FK_ContactPersons_Companies
GO

ALTER TABLE ContactPersons DROP COLUMN CompanyID
GO

ALTER TABLE Contacts DROP CONSTRAINT FK_Contacts_Companies
GO

ALTER TABLE Contacts DROP COLUMN CompanyID
GO

SELECT * FROM Statbooks WHERE TypeID = 3

UPDATE Statbooks SET Color = N'#FFC4C6' WHERE ID = 302
UPDATE Statbooks SET Color = N'#95C8FF' WHERE ID = 303
UPDATE Statbooks SET Color = N'#FFFF12' WHERE ID = 304
UPDATE Statbooks SET Color = N'#12FF1A' WHERE ID = 305
UPDATE Statbooks SET Color = N'#D0D2D1' WHERE ID = 306
GO

ALTER TABLE ProjectTasks ADD Price DEC(18, 2) NULL
GO

ALTER TABLE ProjectTasks ADD InvoiceID INT NULL
GO

ALTER TABLE [dbo].[ProjectTasks]  WITH CHECK ADD  CONSTRAINT [FK_ProjectTasks_Invoices] FOREIGN KEY([InvoiceID])
REFERENCES [dbo].[Invoices] ([ID])
GO

ALTER TABLE [dbo].[ProjectTasks] CHECK CONSTRAINT [FK_ProjectTasks_Invoices]
GO

ALTER TABLE [dbo].[Projects] DROP CONSTRAINT [FK_Projects_MobileOperators]
GO

ALTER TABLE Projects DROP COLUMN MobileOperatorID
GO

ALTER TABLE Projects ADD EmployeeID INT NULL
GO

ALTER TABLE [dbo].[Projects]  WITH CHECK ADD  CONSTRAINT [FK_Projects_Employees] FOREIGN KEY([EmployeeID])
REFERENCES [dbo].[Employees] ([ID])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[Projects] CHECK CONSTRAINT [FK_Projects_Employees]
GO

INSERT INTO Statbooks (ID, Name, SysName, Deleted, NeedDescription, TypeID, OrderNumber, Color) 
VALUES (307, N'Оценить', N'Estimate', 0, 0, 3, 5, N'#f8ac59')
GO

UPDATE Statbooks SET OrderNumber = 1 WHERE ID = 301
UPDATE Statbooks SET OrderNumber = 3 WHERE ID = 302
UPDATE Statbooks SET OrderNumber = 7 WHERE ID = 303
UPDATE Statbooks SET OrderNumber = 9 WHERE ID = 304
UPDATE Statbooks SET OrderNumber = 12 WHERE ID = 305
UPDATE Statbooks SET OrderNumber = 15 WHERE ID = 306
GO

ALTER TABLE [dbo].[Contractors] DROP CONSTRAINT [FK_Contractors_Companies]
GO

ALTER TABLE Contractors DROP COLUMN CompanyID
GO

UPDATE Statbooks SET Name = N'Делать' WHERE ID = 303
UPDATE Statbooks SET Name = N'Тестировать' WHERE ID = 305
GO

UPDATE Statbooks SET Color = N'#FFC4C6' WHERE ID = 501
UPDATE Statbooks SET Color = N'#f8ac59' WHERE ID = 502
UPDATE Statbooks SET Color = N'#FFFF12' WHERE ID = 503
UPDATE Statbooks SET Color = N'#12FF1A' WHERE ID = 504
GO

UPDATE Statbooks SET OrderNumber = (ID - 500) * (ID - 500) WHERE TypeID = 5
GO

ALTER TABLE ProjectTasks ADD TermHours FLOAT NULL
GO

INSERT INTO Statbooks (ID, Name, SysName, Deleted, NeedDescription, TypeID, OrderNumber, Color) 
VALUES (308, N'Контроль', N'Checkout', 0, 0, 3, 14, N'#12FF1A')
GO

SELECT * FROM ProjectTasks

ALTER TABLE ProjectTasks ADD AnalystDescription NVARCHAR(MAX) NULL
ALTER TABLE ProjectTasks ADD TesterDescription NVARCHAR(MAX) NULL
GO

ALTER TABLE ProjectTasks ADD VisibilityID INT NULL
GO

ALTER TABLE [dbo].[ProjectTasks]  WITH CHECK ADD  CONSTRAINT [FK_ProjectTasks_Statbooks_VisibilityID] FOREIGN KEY(VisibilityID)
REFERENCES [dbo].[Statbooks] ([ID])
GO

ALTER TABLE [dbo].[ProjectTasks] CHECK CONSTRAINT [FK_ProjectTasks_Statbooks_VisibilityID]
GO

INSERT INTO StatbookTypes (ID, Name, SysName) VALUES (7, N'TaskVisibilities', N'TaskVisibilities')
GO

INSERT INTO Statbooks (ID, Name, SysName, Deleted, NeedDescription, TypeID, OrderNumber) VALUES 
(701, N'Открытая', N'Visible', 0, 0, 7, 5), 
(702, N'Скрытая', N'Hidden', 0, 0, 7, 10)
GO

UPDATE ProjectTasks SET VisibilityID = 701
GO

ALTER TABLE Projects ADD Code NVARCHAR(50) NULL
GO

ALTER TABLE ProjectTasks ADD Version NVARCHAR(50)
GO

UPDATE TaskTypes SET Name = N'Ошибка', ShortName = N'Ошибка', SortNumber = 2, Code = N'BG', SysName = N'Bug' WHERE ID = 7
UPDATE TaskTypes SET Name = N'Задача', ShortName = N'Задача', SortNumber = 5, Code = N'TS', SysName = N'Task' WHERE ID = 8
UPDATE TaskTypes SET Name = N'Письмо', ShortName = N'Письмо', SortNumber = 9, Code = N'EM', SysName = N'Email' WHERE ID = 9
UPDATE TaskTypes SET Name = N'Звонок', ShortName = N'Звонок', SortNumber = 13, Code = N'CL', SysName = N'Call' WHERE ID = 10
GO

INSERT INTO TaskTypes (Name, Deleted, ShortName, SortNumber, Code, SysName, Report) VALUES (N'Встреча', 0, N'Встреча', 15, N'MT', N'Meeting', 1)
GO

UPDATE ProjectTasks SET TypeID = (CASE WHEN Name LIKE N'%ошибка%' THEN 7 ELSE 8 END)
GO

ALTER TABLE ProjectTasks ADD Deleted BIT NULL
GO

UPDATE ProjectTasks SET Deleted = 0
GO

ALTER TABLE ProjectTasks ALTER COLUMN Deleted BIT NOT NULL
GO

SELECT * FROM ProjectTasks ORDER BY ChangeDate DESC