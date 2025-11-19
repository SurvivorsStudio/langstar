"""
Storage Service - MongoDB CRUD operations for workflows, AI connections, and user nodes
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from server.config.database import (
    get_workflows_collection,
    get_ai_connections_collection,
    get_user_nodes_collection,
    get_deployments_collection,
    get_deployment_versions_collection
)

class StorageService:
    """Service for managing workflow storage in MongoDB"""
    
    # ==================== Workflows ====================
    
    def get_all_workflows(self) -> List[Dict[str, Any]]:
        """Get all workflows"""
        collection = get_workflows_collection()
        if collection is None:
            raise Exception("MongoDB not connected. Please install and start MongoDB.")
        workflows = list(collection.find({}, {'_id': 0}))
        return workflows
    
    def get_workflow_by_name(self, project_name: str) -> Optional[Dict[str, Any]]:
        """Get workflow by project name"""
        collection = get_workflows_collection()
        if collection is None:
            raise Exception("MongoDB not connected. Please install and start MongoDB.")
        workflow = collection.find_one({'projectName': project_name}, {'_id': 0})
        return workflow
    
    def create_workflow(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new workflow"""
        collection = get_workflows_collection()
        workflow_data['lastModified'] = datetime.utcnow().isoformat()
        
        # Check if workflow with same name exists
        existing = collection.find_one({'projectName': workflow_data['projectName']})
        if existing:
            raise ValueError(f"Workflow with name '{workflow_data['projectName']}' already exists")
        
        collection.insert_one(workflow_data)
        return {**workflow_data, '_id': None}  # Remove _id from response
    
    def update_workflow(self, project_name: str, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing workflow"""
        collection = get_workflows_collection()
        workflow_data['lastModified'] = datetime.utcnow().isoformat()
        
        result = collection.replace_one(
            {'projectName': project_name},
            workflow_data,
            upsert=True
        )
        
        return workflow_data
    
    def delete_workflow(self, project_name: str) -> bool:
        """Delete workflow by project name"""
        collection = get_workflows_collection()
        result = collection.delete_one({'projectName': project_name})
        return result.deleted_count > 0
    
    def rename_workflow(self, old_name: str, new_name: str) -> bool:
        """Rename workflow"""
        collection = get_workflows_collection()
        
        # Check if new name already exists
        if collection.find_one({'projectName': new_name}):
            raise ValueError(f"Workflow with name '{new_name}' already exists")
        
        # Get the old workflow
        old_workflow = collection.find_one({'projectName': old_name})
        if not old_workflow:
            raise ValueError(f"Workflow '{old_name}' not found")
        
        # Update the project name
        old_workflow['projectName'] = new_name
        old_workflow['lastModified'] = datetime.utcnow().isoformat()
        
        # Delete old and insert new (rename operation)
        collection.delete_one({'projectName': old_name})
        collection.insert_one(old_workflow)
        
        return True
    
    # ==================== AI Connections ====================
    
    def get_all_ai_connections(self) -> List[Dict[str, Any]]:
        """Get all AI connections"""
        collection = get_ai_connections_collection()
        connections = list(collection.find({}, {'_id': 0}))
        return connections
    
    def get_ai_connection_by_id(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """Get AI connection by ID"""
        collection = get_ai_connections_collection()
        connection = collection.find_one({'id': connection_id}, {'_id': 0})
        return connection
    
    def create_ai_connection(self, connection_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new AI connection"""
        collection = get_ai_connections_collection()
        connection_data['lastModified'] = datetime.utcnow().isoformat()
        
        # Check if connection with same ID exists
        existing = collection.find_one({'id': connection_data['id']})
        if existing:
            raise ValueError(f"AI Connection with ID '{connection_data['id']}' already exists")
        
        collection.insert_one(connection_data)
        return {**connection_data, '_id': None}
    
    def update_ai_connection(self, connection_id: str, connection_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing AI connection"""
        collection = get_ai_connections_collection()
        connection_data['lastModified'] = datetime.utcnow().isoformat()
        connection_data['id'] = connection_id  # Ensure ID doesn't change
        
        result = collection.replace_one(
            {'id': connection_id},
            connection_data,
            upsert=False
        )
        
        if result.matched_count == 0:
            raise ValueError(f"AI Connection with ID '{connection_id}' not found")
        
        return connection_data
    
    def delete_ai_connection(self, connection_id: str) -> bool:
        """Delete AI connection by ID"""
        collection = get_ai_connections_collection()
        result = collection.delete_one({'id': connection_id})
        return result.deleted_count > 0
    
    # ==================== User Nodes ====================
    
    def get_all_user_nodes(self) -> List[Dict[str, Any]]:
        """Get all user nodes"""
        collection = get_user_nodes_collection()
        nodes = list(collection.find({}, {'_id': 0}))
        return nodes
    
    def get_user_node_by_id(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get user node by ID"""
        collection = get_user_nodes_collection()
        node = collection.find_one({'id': node_id}, {'_id': 0})
        return node
    
    def get_user_node_by_name(self, node_name: str) -> Optional[Dict[str, Any]]:
        """Get user node by name"""
        collection = get_user_nodes_collection()
        node = collection.find_one({'name': node_name}, {'_id': 0})
        return node
    
    def create_user_node(self, node_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new user node"""
        collection = get_user_nodes_collection()
        node_data['lastModified'] = datetime.utcnow().isoformat()
        
        # Check if node with same ID exists
        existing = collection.find_one({'id': node_data['id']})
        if existing:
            raise ValueError(f"User Node with ID '{node_data['id']}' already exists")
        
        collection.insert_one(node_data)
        return {**node_data, '_id': None}
    
    def update_user_node(self, node_id: str, node_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing user node"""
        collection = get_user_nodes_collection()
        node_data['lastModified'] = datetime.utcnow().isoformat()
        node_data['id'] = node_id  # Ensure ID doesn't change
        
        result = collection.replace_one(
            {'id': node_id},
            node_data,
            upsert=False
        )
        
        if result.matched_count == 0:
            raise ValueError(f"User Node with ID '{node_id}' not found")
        
        return node_data
    
    def delete_user_node(self, node_id: str) -> bool:
        """Delete user node by ID"""
        collection = get_user_nodes_collection()
        result = collection.delete_one({'id': node_id})
        return result.deleted_count > 0
    
    # ==================== Deployments ====================
    
    def get_all_deployments(self) -> List[Dict[str, Any]]:
        """Get all deployments"""
        collection = get_deployments_collection()
        deployments = list(collection.find({}, {'_id': 0}))
        return deployments
    
    def get_deployment_by_id(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get deployment by ID"""
        collection = get_deployments_collection()
        deployment = collection.find_one({'id': deployment_id}, {'_id': 0})
        return deployment
    
    def get_deployments_by_workflow_id(self, workflow_id: str) -> List[Dict[str, Any]]:
        """Get deployments by workflow ID"""
        collection = get_deployments_collection()
        deployments = list(collection.find({'workflowId': workflow_id}, {'_id': 0}))
        return deployments
    
    def create_deployment(self, deployment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new deployment"""
        collection = get_deployments_collection()
        deployment_data['createdAt'] = datetime.utcnow().isoformat()
        deployment_data['updatedAt'] = datetime.utcnow().isoformat()
        
        # Check if deployment with same ID exists
        existing = collection.find_one({'id': deployment_data['id']})
        if existing:
            raise ValueError(f"Deployment with ID '{deployment_data['id']}' already exists")
        
        collection.insert_one(deployment_data)
        return {**deployment_data, '_id': None}
    
    def update_deployment(self, deployment_id: str, deployment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing deployment"""
        collection = get_deployments_collection()
        deployment_data['updatedAt'] = datetime.utcnow().isoformat()
        deployment_data['id'] = deployment_id  # Ensure ID doesn't change
        
        result = collection.update_one(
            {'id': deployment_id},
            {'$set': deployment_data}
        )
        
        if result.matched_count == 0:
            raise ValueError(f"Deployment with ID '{deployment_id}' not found")
        
        # Return updated deployment
        return self.get_deployment_by_id(deployment_id)
    
    def delete_deployment(self, deployment_id: str) -> bool:
        """Delete deployment by ID"""
        # Also delete related versions
        versions_collection = get_deployment_versions_collection()
        versions_collection.delete_many({'deploymentId': deployment_id})
        
        collection = get_deployments_collection()
        result = collection.delete_one({'id': deployment_id})
        return result.deleted_count > 0
    
    # ==================== Deployment Versions ====================
    
    def get_versions_by_deployment_id(self, deployment_id: str) -> List[Dict[str, Any]]:
        """Get all versions for a deployment"""
        collection = get_deployment_versions_collection()
        versions = list(collection.find({'deploymentId': deployment_id}, {'_id': 0}))
        return versions
    
    def get_version_by_id(self, version_id: str) -> Optional[Dict[str, Any]]:
        """Get version by ID"""
        collection = get_deployment_versions_collection()
        version = collection.find_one({'id': version_id}, {'_id': 0})
        return version
    
    def create_deployment_version(self, version_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new deployment version"""
        collection = get_deployment_versions_collection()
        version_data['createdAt'] = datetime.utcnow().isoformat()
        
        # Check if version with same ID exists
        existing = collection.find_one({'id': version_data['id']})
        if existing:
            raise ValueError(f"Deployment Version with ID '{version_data['id']}' already exists")
        
        collection.insert_one(version_data)
        return {**version_data, '_id': None}
    
    def update_deployment_version(self, version_id: str, version_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing deployment version"""
        collection = get_deployment_versions_collection()
        version_data['id'] = version_id  # Ensure ID doesn't change
        
        result = collection.update_one(
            {'id': version_id},
            {'$set': version_data}
        )
        
        if result.matched_count == 0:
            raise ValueError(f"Deployment Version with ID '{version_id}' not found")
        
        return self.get_version_by_id(version_id)
    
    def delete_deployment_version(self, version_id: str) -> bool:
        """Delete deployment version by ID"""
        collection = get_deployment_versions_collection()
        result = collection.delete_one({'id': version_id})
        return result.deleted_count > 0
    
    def activate_deployment_version(self, deployment_id: str, version_id: str) -> bool:
        """Activate a specific version (deactivate others)"""
        collection = get_deployment_versions_collection()
        
        # Deactivate all versions for this deployment
        collection.update_many(
            {'deploymentId': deployment_id},
            {'$set': {'isActive': False}}
        )
        
        # Activate the specified version
        result = collection.update_one(
            {'id': version_id, 'deploymentId': deployment_id},
            {'$set': {'isActive': True}}
        )
        
        return result.modified_count > 0

# Global service instance
storage_service = StorageService()

