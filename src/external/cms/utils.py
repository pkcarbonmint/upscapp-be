from typing import Union, List, Optional

def stringify_parameters(name: str, parameters: Union[dict, List[str], None]) -> dict:
        """Stringify dict for query parameters."""
        if type(parameters) is dict:
            return {name + k: v for k, v in _flatten_parameters(parameters)}
        elif type(parameters) is str:
            return {name: parameters}
        elif type(parameters) is list:
            return {name: ','.join(parameters)}
        else:
            return {}
              
def _flatten_parameters(parameters: dict):
        """Flatten parameters dict for query."""
        for key, value in parameters.items():
            if isinstance(value, dict):
                for key1, value1 in _flatten_parameters(value):
                    if isinstance(value1, list):
                        for i in range(len(value1)):
                            if isinstance(value1[i], dict):
                                for key2, value2 in _flatten_parameters(value1[i]):
                                    yield f'[{key}]{key1}[{i}]{key2}', value2
                            else:
                                yield f'[{key}]{key1}[{i}]', value1[i]
                    else:
                        yield f'[{key}]{key1}', value1
            else:
                yield f'[{key}]', value