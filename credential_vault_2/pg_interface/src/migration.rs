use crate::types::Result;
use tokio_postgres::Client;

pub async fn run_migration(client: &Client) -> Result<()> {
    let migration_sql = include_str!("../migrate/migrate.sql");

    client.batch_execute(migration_sql).await?;

    println!("Migration completed successfully");
    Ok(())
}

pub async fn run_migration_with_drop(client: &Client) -> Result<()> {
    crate::postgres::drop_all_tables_if_exist(client).await?;
    run_migration(client).await?;
    Ok(())
}
