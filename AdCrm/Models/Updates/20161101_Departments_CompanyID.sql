ALTER TABLE [dbo].[Departments] DROP CONSTRAINT [FK_Departments_Companies]
GO

ALTER TABLE Departments DROP COLUMN CompanyID
GO
ALTER TABLE [dbo].[Positions] DROP CONSTRAINT [FK_Positions_Companies]
GO

ALTER TABLE Positions DROP COLUMN CompanyID
GO
