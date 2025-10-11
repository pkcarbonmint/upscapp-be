from firebase_admin import messaging
from typing import List, Optional, Dict, Any


class PushNotification:
    def __init__(self):
        pass

    async def send_push(
        self,
        registration_tokens: list[str],
        title: str | None = None,
        body: str | None = None,
        data: Dict[str, str] | None = None,
    ):
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=data,
            tokens=registration_tokens,
        )
       
        response = messaging.send_each_for_multicast(message)
       
        if response.failure_count > 0:
            responses = response.responses
            failed_tokens = []
            for id, resp in enumerate(responses):
                if not resp.success:
                    # The order of responses corresponds to the order of the registration tokens.
                    failed_tokens.append(registration_tokens[id])
            print(f"List of tokens that caused failures: {failed_tokens}")

        return response
    
    async def subscribe_topic_push(self, registration_tokens: list[str],topic: str):
        response = messaging.subscribe_to_topic(registration_tokens, topic)
        print(response.success_count, 'tokens were subscribed successfully')

    async def unsubscribe_topic_push(self, registration_tokens: list[str],topic: str):
        response = messaging.unsubscribe_from_topic(registration_tokens, topic)
        print("unscribed_token", response)
    
    async def send_by_topic_push(self,topic:str, title:str, body:str,data:Dict[str,str]):
        message = messaging.Message(notification=messaging.Notification(title=title, body=body),data=data,topic=topic)
        response = messaging.send(message)
        print('Successfully sent message:', response)




push_notification = PushNotification()
