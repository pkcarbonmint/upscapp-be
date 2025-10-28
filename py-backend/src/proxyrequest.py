import aiohttp


async def gateway_request(method:str, url:str, headers:dict= None, params:dict=None, json_data:dict= None):
       
    async with aiohttp.ClientSession() as session:
                async with session.request(method=method, url=url, headers=headers, params=params, json = json_data) as res:
                    if res.status != 200:
                        raise Exception(f'Unable to get entry, error {res.status}: {await res.json()}')
                    return await res.json()