"""
MongoDB Database Configuration
"""
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from typing import Optional
import os
import sys

# MongoDB 연결 설정
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "langstar_db"

class MongoDB:
    """MongoDB Connection Manager (Singleton)"""
    
    _instance: Optional['MongoDB'] = None
    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDB, cls).__new__(cls)
        return cls._instance
    
    def connect(self) -> Database:
        """Connect to MongoDB and return database instance"""
        if self._client is None:
            try:
                self._client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
                self._db = self._client[DATABASE_NAME]
                # Test connection
                self._client.admin.command('ping')
                print(f"[OK] Successfully connected to MongoDB at {MONGODB_URL}")
                print(f"[DB] Database: {DATABASE_NAME}")
            except Exception as e:
                print(f"[ERROR] Failed to connect to MongoDB: {e}")
                print(f"[WARNING] Server will continue without MongoDB")
                print(f"[INFO] Storage features will not work until MongoDB is installed and running")
                # Don't raise - allow server to continue
                self._client = None
                self._db = None
        return self._db
    
    def get_db(self) -> Optional[Database]:
        """Get database instance"""
        if self._db is None:
            return self.connect()
        return self._db
    
    def get_collection(self, collection_name: str) -> Optional[Collection]:
        """Get collection by name"""
        db = self.get_db()
        if db is None:
            return None
        return db[collection_name]
    
    def close(self):
        """Close MongoDB connection"""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            print("[INFO] MongoDB connection closed")

# Global MongoDB instance
mongodb = MongoDB()

# Collection names
WORKFLOWS_COLLECTION = "workflows"
AI_CONNECTIONS_COLLECTION = "ai_connections"
USER_NODES_COLLECTION = "user_nodes"
DEPLOYMENTS_COLLECTION = "deployments"
DEPLOYMENT_VERSIONS_COLLECTION = "deployment_versions"

def get_database() -> Optional[Database]:
    """Get MongoDB database instance"""
    return mongodb.get_db()

def get_workflows_collection() -> Optional[Collection]:
    """Get workflows collection"""
    return mongodb.get_collection(WORKFLOWS_COLLECTION)

def get_ai_connections_collection() -> Optional[Collection]:
    """Get AI connections collection"""
    return mongodb.get_collection(AI_CONNECTIONS_COLLECTION)

def get_user_nodes_collection() -> Optional[Collection]:
    """Get user nodes collection"""
    return mongodb.get_collection(USER_NODES_COLLECTION)

def get_deployments_collection() -> Optional[Collection]:
    """Get deployments collection"""
    return mongodb.get_collection(DEPLOYMENTS_COLLECTION)

def get_deployment_versions_collection() -> Optional[Collection]:
    """Get deployment versions collection"""
    return mongodb.get_collection(DEPLOYMENT_VERSIONS_COLLECTION)

def init_database():
    """Initialize database with indexes"""
    try:
        db = get_database()
        if db is None:
            print("[WARNING] Skipping database initialization - MongoDB not connected")
            return
        
        # Workflows collection indexes
        workflows = get_workflows_collection()
        workflows.create_index("projectName", unique=True)
        workflows.create_index("projectId")
        workflows.create_index("lastModified")
        
        # AI Connections collection indexes
        ai_connections = get_ai_connections_collection()
        ai_connections.create_index("id", unique=True)
        ai_connections.create_index("name")
        ai_connections.create_index("status")
        
        # User Nodes collection indexes
        user_nodes = get_user_nodes_collection()
        user_nodes.create_index("id", unique=True)
        user_nodes.create_index("name")
        
        # Deployments collection indexes
        deployments = get_deployments_collection()
        deployments.create_index("id", unique=True)
        deployments.create_index("workflowId")
        deployments.create_index("status")
        deployments.create_index("environment")
        deployments.create_index("createdAt")
        
        # Deployment Versions collection indexes
        deployment_versions = get_deployment_versions_collection()
        deployment_versions.create_index("id", unique=True)
        deployment_versions.create_index("deploymentId")
        deployment_versions.create_index("version")
        deployment_versions.create_index("createdAt")
        
        print("[OK] Database indexes created successfully")
    except Exception as e:
        print(f"[WARNING] Error creating database indexes: {e}")

