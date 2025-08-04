use crate::types::Result;
use tokio_postgres::{Client, NoTls};

pub async fn drop_all_tables_if_exist(client: &Client) -> Result<()> {
    let table_name_rows = client
        .query(
            "SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema='public' AND table_type='BASE TABLE'",
            &[],
        )
        .await?;

    if !table_name_rows.is_empty() {
        let table_names: Vec<String> = table_name_rows
            .iter()
            .map(|row| row.get::<_, String>("table_name"))
            .collect();

        println!("Existing tables: {:?}", table_names);

        for table_name in &table_names {
            let query = format!("DROP TABLE IF EXISTS {} CASCADE", table_name);
            client.execute(&query, &[]).await?;
        }

        println!("Dropped tables, count: {}", table_names.len());
    }

    Ok(())
}

pub async fn connect_to_postgres(connection_string: &str) -> Result<Client> {
    let (client, connection) = tokio_postgres::connect(connection_string, NoTls).await?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Connection error: {}", e);
        }
    });

    Ok(client)
}
