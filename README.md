# Find my Pet Notification

## Tecnologias

* Mongodb para salvar os dados de quem comentou no post
* Nodejs para criação do serviço
* Mailtrap para envio de emails (verificar plano free)
* Rabbit MQ, mensageria de onde vai consumir as informações sobre o post

## Funcionamento

Notificar o autor do post sempre que um comentario for feito no post (exceto, é
claro, quando o comentario foi feito pelo prorio).

Fluxo seria o seguinte:

O usuario John criou um post sobre gato que está desaparecido, um usuario Marry
foi lá e comentou, informando que viu o gato proximo a sua casa, ao realizar o
comentario (envio do comentario para api), a api deve além de salvar o
comentario, produzir uma mensagem para uma fila no rabbit mq, mensagem essa que
será consumida pelo serviço de notificação.

Podemos ter uma fila chamada `post_comment_notification`, e na mensagem vai o endereço
de email do autor do post (quem vai receber a mensagem), o nome de quem fez o
comentario e o email de quem fez o comentario.

```json
    {
        "post_id": 1,
        "post_author_email": "john@domain.com",
        "post_author_name": "john",
        "comment_author_email": "marry@domain.com",
        "comment_author_name": "marry"
    }
```

O serviço de notificação vai, por sua vez, consumir essa mensagem da fila, e
criar um email a ser enviado.

Além do envio do email, o serviço de notificação deve manter um registro
salvo (mongodb) de cada mensagem de comentario consumida, pois, quando o
post mudar de status, ele vai consumir a base de todos que comentaram e enviar
um email para todos que comentaram (exceto o autor do post) informando que o post
mudou seu status.
