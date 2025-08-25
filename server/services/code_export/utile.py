

# 노드 id를 라벨로 변환합니다. 
def init_node_id_to_node_label( create_node_json ) : 
    node_id_to_node_label = {}
    for node in create_node_json['nodes']:
        node_id = node['id']
        node_type = node['type']
        node_label = node['data']['label']
        node_id_to_node_label[node_id] = {'node_name': node_label, 'node_type': node_type}
    return node_id_to_node_label

# 노드의 관계를 json으로 변환합니다. 
def init_edge_relation( create_node_json ) :
    node_id_to_node_label = init_node_id_to_node_label( create_node_json )
    edge_relation = {}
    for edge in create_node_json['edges']:
        source = edge['source'] 
        target = edge['target'] 
        source_node_name = node_id_to_node_label[source]['node_name']
        target_node_name = node_id_to_node_label[target]['node_name']
        target_node_type = node_id_to_node_label[target]['node_type']
        
        if source_node_name not in edge_relation:
            edge_relation[source_node_name] = [{'node_name': target_node_name, 'node_type': target_node_type}]
        else:
            edge_relation[source_node_name].append({'node_name': target_node_name, 'node_type': target_node_type})
    return edge_relation


def init_node_config( create_node_json ) : 
    edge_relation         = init_edge_relation( create_node_json )
    node_id_to_node_label = init_node_id_to_node_label( create_node_json )
    
    result = []
    for node in create_node_json['nodes']:
        if node['type'] == 'startNode':
            node_id = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            node_config = node['data']['config']['variables']
            
            temp_config = {}
            config_dict = {}
            for token_config in node_config:
                config_dict.update({token_config['name']: token_config['defaultValue']})

            config_id = node_name + "_Config"
            temp_config[config_id] = {'config': config_dict}
            temp_config[config_id]['node_type'] = node_type
            temp_config[config_id]['next_node'] = edge_relation[node_name]
            temp_config[config_id]['node_name'] = node_name

            result.append(temp_config.copy())
            result.append({node_name: {}})
            
        elif node['type'] == 'promptNode':
            node_id = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            template = node['data']['config']['template']
            outputVariable = node['data']['config']['outputVariable']

            temp_config = {}
            config_id = node_name + "_Config"
            temp_config[config_id] = {'config': {'template': template}}
            temp_config[config_id]['outputVariable'] = outputVariable
            temp_config[config_id]['node_type'] = node_type
            temp_config[config_id]['next_node'] = edge_relation[node_name]
            temp_config[config_id]['node_name'] = node_name

            result.append(temp_config.copy())
            result.append({node_name: {}})
            
        elif node['type'] == 'mergeNode':
            node_id = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            mergeMappings = node['data']['config']['mergeMappings']

            config_dict = {}
            for return_style in mergeMappings:
                output_value = return_style['outputKey']
                source_node = return_style['sourceNodeId']
                source_node_value = return_style['sourceNodeKey']
                
                source_node_name = node_id_to_node_label[source_node]['node_name']
                config_dict[output_value] = {'node_name': source_node_name, 'node_value': source_node_value}

            temp_config = {}
            config_id = node_name + "_Config"
            temp_config[config_id] = {'config': config_dict}
            temp_config[config_id]['node_type'] = node_type
            temp_config[config_id]['next_node'] = edge_relation[node_name]
            temp_config[config_id]['node_name'] = node_name

            result.append(temp_config.copy())
            result.append({node_name: {"__annotated__": True}})
    
        elif node['type'] == 'endNode':
            node_id = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            outputVariable = node['data']['config']

            temp_config = {}
            config_id = node_name + "_Config"
            temp_config[config_id] = {'config': {'receiveKey': [outputVariable['receiveKey']]}}

            result.append(temp_config.copy())
            result.append({node_name: {}})

        elif node['type'] == 'functionNode':
            node_id = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            python_conde = node['data']['code']
            
            temp_config = {}
            config_id = node_name + "_Config"
            temp_config[config_id] = {'config': {'code': python_conde}}
            temp_config[config_id]['node_type'] = node_type
            temp_config[config_id]['next_node'] = edge_relation[node_name]
            temp_config[config_id]['node_name'] = node_name

            result.append(temp_config.copy())
            result.append({node_name: {}})

        elif node['type'] == 'conditionNode':
            node_id = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            conditions_config_list = node['data']['config']['conditions']

            config_id = node_name + "_Config"
            temp_config = {}
            temp_config[config_id] = {'config': []}
            
            for row in conditions_config_list:
                temp_config[config_id]['config'].append({
                    'targetNodeLabel': row['targetNodeLabel'],
                    'condition': row['condition'],
                    'description': row['description']
                })

            temp_config[config_id]['node_type'] = node_type
            temp_config[config_id]['next_node'] = edge_relation[node_name]
            temp_config[config_id]['node_name'] = node_name

            result.append(temp_config.copy())
            result.append({node_name: {}})
        
        elif node['type'] == 'agentNode': 
            node_id   = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            
            conditions_config_list = node['data']['config']

            config_id = node_name + "_Config"

            temp_config = {}
            temp_config[config_id] = { 'config' : conditions_config_list } 
            
            temp_config[config_id]['config']['node_type'] = node_type
            temp_config[config_id]['config']['next_node'] = edge_relation[node_name]
            temp_config[config_id]['config']['node_name'] = node_name
            temp_config[config_id]['config']['chat_history'] = []

            result.append( temp_config.copy() )
            result.append( {node_name : {}} )  

        elif node['type'] == 'userNode':
            node_id = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            python_conde = node['data']['code']

            node_parameters = node['data']['config']['parameters']
            outputVariable = node['data']['config']['outputVariable']
            
            temp_config = {}
            config_id = node_name + "_Config"
            temp_config[config_id] = {'config': {'code': python_conde}, 'parameters': node_parameters, 'outputVariable': outputVariable}
            temp_config[config_id]['node_type'] = node_type
            temp_config[config_id]['next_node'] = edge_relation[node_name]
            temp_config[config_id]['node_name'] = node_name

            result.append(temp_config.copy())
            result.append({node_name: {}})


    return result