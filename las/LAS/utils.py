def getLASUrl():
    from .settings import DB_NAME,DB_USERNAME,DB_PASSWORD,DB_HOST
    try:
        import pymysql
        db=pymysql.connect(DB_HOST,DB_USERNAME,DB_PASSWORD,DB_NAME, charset='utf8')
        cursor= db.cursor(pymysql.cursors.DictCursor)

        cursor.execute("SELECT domain FROM django_site WHERE name='LASDomain';")
        domain = cursor.fetchone()
        cursor.close()
        db.close()
        return domain['domain']
    except Exception as e:
        print('Error retrieving LAS Url:',e)
        return ''



