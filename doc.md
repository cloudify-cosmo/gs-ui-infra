# Application Map Documentation

## JSON structure example

{
    "nodes": [{
        "id": 1,
        "name": "vagrant_host",
        "type": ["cloudify.tosca.types.host"]
    }, {
        "id": 2,
        "name": "pickle_db",
        "type": ["cloudify.tosca.types.db_server", "cloudify.tosca.types.middleware_server"]
    }, {
        "id": 3,
        "name": "flask",
        "type": ["cloudify.tosca.types.web_server", "cloudify.tosca.types.middleware_server"]
    }, {
        "id": 4,
        "name": "flask_app",
        "type": ["cloudify.tosca.types.app_module"]
    }],
    "edges": [{
        "id": "contained_in",
        "origin": 2,
        "target": 1
    }, {
        "id": "contained_in",
        "origin": 3,
        "target": 1
    }, {
        "id": "contained_in",
        "origin": 4,
        "target": 3
    }, {
        "id": "connected_to",
        "origin": 4,
        "target": 2
    }]
}
